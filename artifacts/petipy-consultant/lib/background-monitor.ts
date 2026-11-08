import BackgroundService from 'react-native-background-actions';
import { PermissionsAndroid, Platform } from 'react-native';
import { getIncomingCalls, PetipyApiError } from '@/lib/petipy-api';
import {
  cancelIncomingCallNotification,
  clearIncomingCallNotifications,
  notifyIncomingCall,
  prepareIncomingCallAlerts,
  startIncomingCallRingtone,
  stopIncomingCallRingtone,
} from '@/lib/incoming-call-alerts';
import {
  endSystemCall,
  markSystemCallActive,
  registerSystemCalling,
  reportSystemIncomingCall,
} from '@/lib/system-calling';
import { isUnexpiredRequestedCall } from '@/lib/incoming-push-routing';

const POLL_INTERVAL_MS = 5_000;
type ActiveCallState = 'connecting' | 'connected' | 'reconnecting';
type ActiveCallNotice = { callId: string; state: ActiveCallState } | null;
let activeCallNotice: ActiveCallNotice = null;

function getAvailabilityNotification(pendingCount: number) {
  if (activeCallNotice?.state === 'connected') {
    return {
      taskTitle: 'تماس مشاوره متصل است',
      taskDesc: 'تماس صوتی در حال انجام است؛ برای کنترل تماس برنامه را باز کنید.',
    };
  }
  if (activeCallNotice?.state === 'reconnecting') {
    return {
      taskTitle: 'بازیابی تماس مشاوره',
      taskDesc: 'ارتباط تماس قطع شد؛ در حال تلاش برای اتصال دوباره هستیم.',
    };
  }
  if (activeCallNotice?.state === 'connecting') {
    return {
      taskTitle: 'تماس پاسخ داده شد',
      taskDesc: 'در حال برقراری ارتباط صوتی امن با مشتری…',
    };
  }
  if (pendingCount > 0) {
    return {
      taskTitle: `تماس ورودی مشاوره · ${pendingCount}`,
      taskDesc:
        pendingCount === 1
          ? 'یک درخواست تماس دارید؛ برای پاسخ، برنامه را باز کنید.'
          : `${pendingCount} درخواست تماس دارید؛ برای پاسخ، برنامه را باز کنید.`,
    };
  }
  return {
    taskTitle: 'پتی پای؛ آماده‌ی تماس',
    taskDesc: 'در انتظار درخواست مشاوره',
  };
}

export function setAvailabilityCallState(
  callId: string | null,
  state: ActiveCallState | null,
) {
  activeCallNotice = callId && state ? { callId, state } : null;
  if (Platform.OS === 'android' && BackgroundService.isRunning()) {
    const notice = getAvailabilityNotification(0);
    void BackgroundService.updateNotification(notice).catch(() => {});
  }
}

async function ensureForegroundNotificationPermission() {
  if (Platform.OS !== 'android') return false;
  if (Number(Platform.Version) < 33) return true;

  const permission = PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS;
  if (await PermissionsAndroid.check(permission)) return true;
  const result = await PermissionsAndroid.request(permission);
  return result === PermissionsAndroid.RESULTS.GRANTED;
}

export async function requestAvailabilityPermissions() {
  const granted = await ensureForegroundNotificationPermission();
  await prepareIncomingCallAlerts();
  return granted;
}

async function sleep(milliseconds: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
}

type MonitorParams = { sessionToken: string; tokenExpiresAt: string };

async function monitorIncomingCalls(params?: MonitorParams) {
  if (!params?.sessionToken || !params.tokenExpiresAt) return;
  const { sessionToken, tokenExpiresAt } = params;
  const expiry = Date.parse(tokenExpiresAt);
  if (!Number.isFinite(expiry)) return;
  let connectionNoticeShown = false;
  const notifiedCallIds = new Set<string>();
  const systemCallIds = new Set<string>();

  try {
    while (BackgroundService.isRunning()) {
      if (Date.now() >= expiry) {
        await BackgroundService.updateNotification({
          taskTitle: 'نشست Petipy منقضی شد',
          taskDesc: 'برنامه را باز کنید و دوباره وارد حساب مشاور شوید.',
        });
        return;
      }

      try {
        const calls = await getIncomingCalls(sessionToken);
        const callsById = new Map(calls.map((call) => [call.id, call]));
        const pendingCalls = calls.filter((call) =>
          isUnexpiredRequestedCall(call),
        );
        const pendingIds = new Set(pendingCalls.map((call) => call.id));
        connectionNoticeShown = false;

        for (const callId of notifiedCallIds) {
          if (!pendingIds.has(callId)) {
            try {
              await cancelIncomingCallNotification(callId);
            } catch {
              // A stale notification should not stop the request poller.
            }
            if (systemCallIds.delete(callId)) {
              const currentCall = callsById.get(callId);
              const callWasAccepted =
                currentCall?.status === 'connecting' ||
                currentCall?.status === 'active';
              const isActiveInThisApp = activeCallNotice?.callId === callId;
              if (callWasAccepted && isActiveInThisApp) {
                await markSystemCallActive(callId);
              } else {
                await endSystemCall(
                  callId,
                  currentCall?.status === 'completed' || isActiveInThisApp
                    ? 'remote'
                    : 'missed',
                );
              }
            }
            notifiedCallIds.delete(callId);
          }
        }

        for (const call of pendingCalls) {
          if (notifiedCallIds.has(call.id)) continue;
          try {
            await notifyIncomingCall(call.id, call.expiresAt);
            if (await reportSystemIncomingCall(call.id, call.expiresAt)) {
              systemCallIds.add(call.id);
            }
            notifiedCallIds.add(call.id);
          } catch {
            await BackgroundService.updateNotification({
              taskTitle: 'تماس ورودی مشاوره',
              taskDesc: 'اعلان تماس نمایش داده نشد؛ برنامه را باز کنید.',
            });
          }
        }

        if (pendingCalls.length > 0) {
          try {
            const expiry = pendingCalls
              .map((call) => call.expiresAt)
              .filter((value): value is string => Boolean(value))
              .sort((left, right) => Date.parse(left) - Date.parse(right))[0];
            startIncomingCallRingtone(expiry);
          } catch {
            await BackgroundService.updateNotification({
              taskTitle: 'تماس ورودی مشاوره',
              taskDesc: 'صدای زنگ فعال نشد؛ برنامه را برای پاسخ باز کنید.',
            });
          }
        } else {
          stopIncomingCallRingtone();
        }

        await BackgroundService.updateNotification(
          getAvailabilityNotification(pendingCalls.length),
        );
      } catch (error) {
        stopIncomingCallRingtone();
        if (
          error instanceof PetipyApiError &&
          (error.status === 401 || error.status === 403)
        ) {
          await BackgroundService.updateNotification({
            taskTitle: 'نشست مشاور معتبر نیست',
            taskDesc: 'برنامه را باز کنید و دوباره وارد حساب مشاور شوید.',
          });
          return;
        }
        if (!connectionNoticeShown) {
          connectionNoticeShown = true;
          await BackgroundService.updateNotification({
            taskTitle: 'پتی پای؛ اتصال برقرار نیست',
            taskDesc: 'برای دریافت تماس، اینترنت و نشست حساب را بررسی کنید.',
          });
        }
      }
      await sleep(POLL_INTERVAL_MS);
    }
  } finally {
    stopIncomingCallRingtone();
    await Promise.all(
      [...systemCallIds].map((callId) =>
        activeCallNotice?.callId === callId
          ? markSystemCallActive(callId)
          : endSystemCall(callId, 'missed'),
      ),
    );
    await Promise.all(
      [...notifiedCallIds].map(async (callId) => {
        try {
          await cancelIncomingCallNotification(callId);
        } catch {
          // Cleanup failures must not prevent the availability service stopping.
        }
      }),
    );
  }
}

export async function startAvailabilityService(
  sessionToken: string,
  tokenExpiresAt: string,
) {
  if (Platform.OS !== 'android' || BackgroundService.isRunning()) return;
  if (!Number.isFinite(Date.parse(tokenExpiresAt)) || Date.parse(tokenExpiresAt) <= Date.now()) {
    throw new Error('نشست مشاور منقضی شده است؛ دوباره وارد شوید.');
  }
  await prepareIncomingCallAlerts();
  await registerSystemCalling();

  await BackgroundService.start(monitorIncomingCalls, {
    taskName: 'PetipyConsultantAvailability',
    taskTitle: 'پتی پای؛ آماده‌ی تماس',
    taskDesc: 'در انتظار درخواست مشاوره',
    taskIcon: { name: 'ic_launcher', type: 'mipmap' },
    color: '#6b3fe1',
    linkingURI: 'petipy-consultant:///',
    foregroundServiceType: ['microphone'],
    parameters: { sessionToken, tokenExpiresAt },
  });
}

export async function stopAvailabilityService() {
  if (Platform.OS === 'android' && BackgroundService.isRunning()) {
    await BackgroundService.stop();
  }
  stopIncomingCallRingtone();
  activeCallNotice = null;
  try {
    await clearIncomingCallNotifications();
  } catch {
    // Notification cleanup must not block switching availability offline.
  }
}
