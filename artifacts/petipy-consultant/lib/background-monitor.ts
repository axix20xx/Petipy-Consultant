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

const POLL_INTERVAL_MS = 10_000;

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
  let ringtoneStarted = false;
  const notifiedCallIds = new Set<string>();

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
        const pendingCalls = calls.filter((call) => {
          if (call.status && call.status !== 'requested') return false;
          if (!call.expiresAt) return true;
          const callExpiry = Date.parse(call.expiresAt);
          return !Number.isFinite(callExpiry) || callExpiry > Date.now();
        });
        const pendingIds = new Set(pendingCalls.map((call) => call.id));
        connectionNoticeShown = false;

        for (const callId of notifiedCallIds) {
          if (!pendingIds.has(callId)) {
            try {
              await cancelIncomingCallNotification(callId);
            } catch {
              // A stale notification should not stop the request poller.
            }
            notifiedCallIds.delete(callId);
          }
        }

        for (const call of pendingCalls) {
          if (notifiedCallIds.has(call.id)) continue;
          try {
            await notifyIncomingCall(call.id);
            notifiedCallIds.add(call.id);
          } catch {
            await BackgroundService.updateNotification({
              taskTitle: 'تماس ورودی مشاوره',
              taskDesc: 'اعلان تماس نمایش داده نشد؛ برنامه را باز کنید.',
            });
          }
        }

        if (pendingCalls.length > 0 && !ringtoneStarted) {
          try {
            startIncomingCallRingtone();
            ringtoneStarted = true;
          } catch {
            await BackgroundService.updateNotification({
              taskTitle: 'تماس ورودی مشاوره',
              taskDesc: 'صدای زنگ فعال نشد؛ برنامه را برای پاسخ باز کنید.',
            });
          }
        } else if (pendingCalls.length === 0 && ringtoneStarted) {
          stopIncomingCallRingtone();
          ringtoneStarted = false;
        }

        await BackgroundService.updateNotification({
          taskTitle: pendingCalls.length
            ? `تماس ورودی مشاوره · ${pendingCalls.length}`
            : 'پتی پای؛ آماده‌ی تماس',
          taskDesc: pendingCalls.length
            ? pendingCalls.length === 1
              ? 'یک درخواست تماس دارید؛ برای پاسخ، برنامه را باز کنید.'
              : `${pendingCalls.length} درخواست تماس دارید؛ برای پاسخ، برنامه را باز کنید.`
            : 'در انتظار درخواست مشاوره',
        });
      } catch (error) {
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
    if (ringtoneStarted) stopIncomingCallRingtone();
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
  try {
    await clearIncomingCallNotifications();
  } catch {
    // Notification cleanup must not block switching availability offline.
  }
}
