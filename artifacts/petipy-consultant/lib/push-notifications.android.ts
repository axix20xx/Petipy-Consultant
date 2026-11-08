import {
  getMessaging,
  getToken,
  onMessage,
  onTokenRefresh,
  registerDeviceForRemoteMessages,
} from '@react-native-firebase/messaging';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import {
  getConsultantPushStatus,
  getIncomingCalls,
  registerConsultantPushDevice,
  revokeConsultantPushDevice,
  PetipyApiError,
} from '@/lib/petipy-api';
import {
  findActiveIncomingCall,
  parseIncomingCallId,
  resolveIncomingPushRoute,
} from '@/lib/incoming-push-routing';
import { readStoredConsultantSession } from '@/lib/consultant-auth';
import {
  notifyIncomingCall,
  prepareIncomingCallAlerts,
} from '@/lib/incoming-call-alerts';
import { requestAvailabilityPermissions } from '@/lib/background-monitor';
import type { PushSetupState, PushStatusListener } from '@/lib/push-notifications';

const DEVICE_ID_KEY = 'petipy_consultant_push_device_id_v1';
const activeRegistrationCleanups = new Set<() => void>();
const inFlightRegistrations = new Set<Promise<void>>();

type PushMessage = { data?: Record<string, unknown> };

function isRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function classifyServerPushStatus(value: unknown): boolean | null {
  const root = isRecord(value);
  for (const key of ['enabled', 'pushEnabled', 'configured', 'available']) {
    if (typeof root[key] === 'boolean') return root[key] as boolean;
  }
  const status = root.status;
  if (typeof status === 'string') {
    if (['enabled', 'ready', 'available'].includes(status.toLowerCase())) {
      return true;
    }
    if (['disabled', 'unavailable', 'not_configured'].includes(status.toLowerCase())) {
      return false;
    }
  }
  return null;
}

async function getOrCreateDeviceId() {
  const existing = await SecureStore.getItemAsync(DEVICE_ID_KEY);
  if (existing) return existing;

  const deviceId = Crypto.randomUUID();
  await SecureStore.setItemAsync(DEVICE_ID_KEY, deviceId);
  return deviceId;
}

function errorMessage(error: unknown) {
  if (error instanceof PetipyApiError && (error.status === 401 || error.status === 403)) {
    return 'نشست مشاور معتبر نیست؛ دوباره وارد Petipy شوید.';
  }
  if (error instanceof PetipyApiError && error.status === 404) {
    return 'API ثبت دستگاه FCM در دسترس نیست؛ دریافت تماس با polling ادامه می‌یابد.';
  }
  return 'ثبت اعلان FCM ناموفق بود؛ اتصال اینترنت و وضعیت سرویس تماس را بررسی کنید.';
}

async function registerCurrentToken(
  sessionToken: string,
  pushToken: string,
  onStatus: PushStatusListener,
  isActive: () => boolean,
) {
  if (!pushToken || !isActive()) return;
  const deviceId = await getOrCreateDeviceId();
  if (!isActive()) return;
  await registerConsultantPushDevice(sessionToken, {
    deviceId,
    platform: 'android',
    pushToken,
  });

  if (!isActive()) return;
  const serverStatus = await getConsultantPushStatus(sessionToken);
  if (!isActive()) return;
  const enabled = classifyServerPushStatus(serverStatus);
  if (enabled === false) {
    onStatus(
      'server-disabled',
      'سرور FCM را غیرفعال اعلام کرده است؛ سرویس foreground همچنان درخواست‌ها را بررسی می‌کند.',
    );
  } else if (enabled === true) {
    onStatus('ready', 'دستگاه برای دریافت تماس‌های FCM ثبت شده است.');
  } else {
    onStatus(
      'status-unknown',
      'دستگاه ثبت شد، اما پاسخ سرور وضعیت FCM را مشخص نکرد؛ polling همچنان فعال است.',
    );
  }
}

export function startPushRegistration(
  sessionToken: string,
  onStatus: PushStatusListener,
) {
  let active = true;
  let unsubscribeTokenRefresh: (() => void) | undefined;
  onStatus('registering', 'در حال درخواست مجوز اعلان و ثبت دستگاه…');

  const register = async (pushToken: string) => {
    if (!active) return;
    const task = registerCurrentToken(
      sessionToken,
      pushToken,
      onStatus,
      () => active,
    ).catch((error) => {
      if (active) onStatus('error', errorMessage(error));
    });
    inFlightRegistrations.add(task);
    try {
      await task;
    } finally {
      inFlightRegistrations.delete(task);
    }
  };

  void (async () => {
    try {
      const permissionGranted = await requestAvailabilityPermissions();
      if (!active) return;
      if (!permissionGranted) {
        onStatus(
          'permission-denied',
          'مجوز اعلان رد شده است. سرویس foreground هنگام آنلاین‌بودن polling را ادامه می‌دهد، اما Android ممکن است اعلان تماس را پنهان کند؛ اعلان Petipy را در تنظیمات فعال کنید.',
        );
        return;
      }

      await prepareIncomingCallAlerts();
      if (!active) return;
      const messaging = getMessaging();
      await registerDeviceForRemoteMessages(messaging);
      if (!active) return;
      unsubscribeTokenRefresh = onTokenRefresh(messaging, (token) => {
        void register(token);
      });
      const token = await getToken(messaging);
      await register(token);
    } catch (error) {
      if (active) onStatus('error', errorMessage(error));
    }
  })();

  const cleanup = () => {
    active = false;
    unsubscribeTokenRefresh?.();
    activeRegistrationCleanups.delete(cleanup);
  };
  activeRegistrationCleanups.add(cleanup);
  return cleanup;
}

export function listenForForegroundIncomingPush(
  sessionToken: string,
  onIncomingCall: (callId: string) => void,
) {
  return onMessage(getMessaging(), async (message) => {
    const routeCallId = parseIncomingCallId(message.data);
    if (!routeCallId) return;
    try {
      const requests = await getIncomingCalls(sessionToken);
      const route = resolveIncomingPushRoute(requests, { callId: routeCallId });
      if (route) onIncomingCall(route.callId);
    } catch {
      // Keep the existing foreground polling fallback; never trust push data alone.
    }
  });
}

export async function handleBackgroundIncomingMessage(message: PushMessage) {
  const callId = parseIncomingCallId(message.data);
  if (!callId) return;

  try {
    const stored = await readStoredConsultantSession(SecureStore);
    if (
      stored.status !== 'ready' ||
      Date.parse(stored.session.tokenExpiresAt) <= Date.now()
    ) {
      return;
    }

    const requests = await getIncomingCalls(stored.session.accessToken);
    const activeCall = findActiveIncomingCall(requests, callId);
    if (!activeCall) return;

    await prepareIncomingCallAlerts();
    await notifyIncomingCall(callId, activeCall.expiresAt);
  } catch {
    // A push is only a signal. Ignore it if session or API validation fails.
  }
}

export async function revokePushDeviceForSession(sessionToken: string) {
  stopPushRegistration();
  await Promise.allSettled([...inFlightRegistrations]);
  try {
    const deviceId = await SecureStore.getItemAsync(DEVICE_ID_KEY);
    if (!deviceId) return true;
    await revokeConsultantPushDevice(sessionToken, deviceId);
    return true;
  } catch {
    return false;
  }
}

export function stopPushRegistration() {
  for (const cleanup of [...activeRegistrationCleanups]) cleanup();
}

export type { PushSetupState, PushStatusListener } from '@/lib/push-notifications';
