import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import {
  finishCall,
  getConsultantPushStatus,
  getIncomingCalls,
  PetipyApiError,
  registerConsultantPushDevice,
  rejectIncomingCall,
  revokeConsultantPushDevice,
} from '@/lib/petipy-api';
import {
  findActiveIncomingCall,
  isUnexpiredRequestedCall,
} from '@/lib/incoming-push-routing';
import type {
  IncomingCallAction,
  PushSetupState,
  PushStatusListener,
} from '@/lib/push-notifications';
import type { CallSession } from 'expo-callkit-telecom';

const DEVICE_ID_KEY = 'petipy_consultant_push_device_id_v1';
const configuredPushEnvironment = process.env.EXPO_PUBLIC_APNS_ENVIRONMENT;
const pushEnvironment =
  configuredPushEnvironment === 'sandbox' ||
  configuredPushEnvironment === 'production'
    ? configuredPushEnvironment
    : __DEV__
      ? 'sandbox'
      : null;
const cleanups = new Set<() => void>();
const inFlightRegistrations = new Set<Promise<void>>();
const callIdsBySystemId = new Map<string, string>();

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function serverVoipConfigured(value: unknown): boolean | null {
  const root = asRecord(value);
  return typeof root.iosVoipConfigured === 'boolean'
    ? root.iosVoipConfigured
    : null;
}

function apiErrorMessage(error: unknown) {
  if (error instanceof PetipyApiError && (error.status === 401 || error.status === 403)) {
    return 'نشست مشاور معتبر نیست؛ دوباره وارد Petipy شوید.';
  }
  if (
    error instanceof PetipyApiError &&
    [400, 404, 405].includes(error.status)
  ) {
    return 'API پتی‌پای هنوز ثبت PushKit برای iOS را فعال نکرده است؛ دریافت زنده تا انتشار تغییر سرور کار نمی‌کند.';
  }
  return 'ثبت تماس بومی iOS ناموفق بود؛ اتصال اینترنت و وضعیت API تماس را بررسی کنید.';
}

async function getOrCreateDeviceId() {
  const existing = await SecureStore.getItemAsync(DEVICE_ID_KEY);
  if (existing) return existing;
  const deviceId = Crypto.randomUUID();
  await SecureStore.setItemAsync(DEVICE_ID_KEY, deviceId);
  return deviceId;
}

async function registerToken(
  sessionToken: string,
  pushToken: string,
  onStatus: PushStatusListener,
  isActive: () => boolean,
) {
  if (!pushToken || !isActive()) return;
  if (!pushEnvironment) {
    onStatus(
      'error',
      'برای نسخهٔ انتشار، EXPO_PUBLIC_APNS_ENVIRONMENT را روی production تنظیم کنید.',
    );
    return;
  }
  const deviceId = await getOrCreateDeviceId();
  if (!isActive()) return;

  await registerConsultantPushDevice(sessionToken, {
    deviceId,
    platform: 'ios',
    pushToken,
    pushEnvironment,
  });
  if (!isActive()) return;

  const status = serverVoipConfigured(
    await getConsultantPushStatus(sessionToken),
  );
  if (!isActive()) return;
  if (status === true) {
    onStatus('ready', 'دستگاه iOS برای تماس‌های PushKit ثبت شده است.');
  } else if (status === false) {
    onStatus(
      'server-disabled',
      'توکن iOS ثبت شد، اما تنظیم ارسال APNs روی سرور فعال نیست.',
    );
  } else {
    onStatus(
      'status-unknown',
      'توکن iOS ثبت شد، اما API وضعیت PushKit را برنگرداند.',
    );
  }
}

function findCallId(session: CallSession | null | undefined) {
  const value = session?.incomingCallEvent?.serverCallId;
  return typeof value === 'string' && value.length <= 200 ? value : null;
}

export function startPushRegistration(
  sessionToken: string,
  onStatus: PushStatusListener,
) {
  let active = true;
  let tokenSubscription: { remove: () => void } | null = null;
  onStatus('registering', 'در حال ثبت دستگاه برای تماس بومی iOS…');

  const registerCurrentToken = (pushToken: string) => {
    if (!active) return;
    const task = registerToken(
      sessionToken,
      pushToken,
      onStatus,
      () => active,
    ).catch((error) => {
      if (active) onStatus('error', apiErrorMessage(error));
    });
    inFlightRegistrations.add(task);
    void task.finally(() => inFlightRegistrations.delete(task));
  };

  void import('expo-callkit-telecom')
    .then((callkit) => {
      if (!active) return;
      callkit.registerVoIPPush();
      tokenSubscription = callkit.addVoIPPushTokenUpdatedListener((event) => {
        if (event.type !== 'APNS_VOIP') return;
        if (event.token) registerCurrentToken(event.token);
        else if (active) {
          onStatus(
            'status-unknown',
            'توکن PushKit توسط iOS باطل شد؛ در حال انتظار برای توکن جدید.',
          );
        }
      });
      const currentToken = callkit.getVoIPPushToken();
      if (currentToken?.type === 'APNS_VOIP') {
        registerCurrentToken(currentToken.token);
      }
    })
    .catch((error) => {
      if (active) onStatus('error', apiErrorMessage(error));
    });

  const cleanup = () => {
    active = false;
    tokenSubscription?.remove();
    cleanups.delete(cleanup);
  };
  cleanups.add(cleanup);
  return cleanup;
}

export function listenForForegroundIncomingPush(
  sessionToken: string,
  onIncomingCall: (
    callId: string,
    action?: IncomingCallAction,
    nativeRequestId?: string,
  ) => void,
) {
  let active = true;
  let callkit: typeof import('expo-callkit-telecom') | null = null;
  const subscriptions: Array<{ remove: () => void }> = [];
  const verifyAndRoute = async (
    callId: string,
    action: IncomingCallAction,
    nativeRequestId?: string,
    systemCallId?: string,
  ) => {
    try {
      const requests = await getIncomingCalls(sessionToken);
      if (!active) return;
      const current = findActiveIncomingCall(requests, callId);
      if (!current) {
        if (systemCallId && callkit) {
          await callkit.reportCallEnded(systemCallId, 'unanswered').catch(() => {});
        }
        return;
      }
      onIncomingCall(callId, action, nativeRequestId);
    } catch {
      if (systemCallId && callkit) {
        await callkit.reportCallEnded(systemCallId, 'failed').catch(() => {});
      }
    }
  };

  void import('expo-callkit-telecom')
    .then((nativeCallkit) => {
      if (!active) return;
      callkit = nativeCallkit;
      subscriptions.push(
        nativeCallkit.addCallSessionAddedListener(({ session }) => {
          const callId = findCallId(session);
          if (!callId) return;
          callIdsBySystemId.set(session.id, callId);
          void verifyAndRoute(callId, 'open', undefined, session.id);
        }),
        nativeCallkit.addCallAnsweredListener((event) => {
          void (async () => {
            const session = await nativeCallkit
              .getActiveCallSession()
              .catch(() => null);
            const callId =
              callIdsBySystemId.get(event.id) ??
              (session?.id === event.id ? findCallId(session) : null);
            if (!callId) return;
            callIdsBySystemId.set(event.id, callId);
            await verifyAndRoute(callId, 'answer', event.requestId, event.id);
          })();
        }),
        nativeCallkit.addCallEndedListener(({ session }) => {
          const callId =
            callIdsBySystemId.get(session.id) ?? findCallId(session);
          if (!callId) return;
          callIdsBySystemId.delete(session.id);

          void (async () => {
            try {
              const requests = await getIncomingCalls(sessionToken);
              const current = requests.find((request) => request.id === callId);
              if (current && isUnexpiredRequestedCall(current)) {
                await rejectIncomingCall(sessionToken, callId, 'busy');
              } else if (
                current &&
                ['connecting', 'active'].includes(current.status ?? '')
              ) {
                await finishCall(sessionToken, callId);
              }
            } catch {
              // The API remains authoritative; an unavailable reject is left visible in the queue.
              onIncomingCall(callId, 'open');
              return;
            }
            if (active) onIncomingCall(callId, 'ended');
          })();
        }),
      );
    })
    .catch(() => {});

  return () => {
    active = false;
    for (const subscription of subscriptions) subscription.remove();
  };
}

export function stopPushRegistration() {
  for (const cleanup of [...cleanups]) cleanup();
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

export async function handleBackgroundIncomingMessage(
  _message: { data?: Record<string, unknown> },
) {}
