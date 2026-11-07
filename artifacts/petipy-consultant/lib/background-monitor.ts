import BackgroundService from 'react-native-background-actions';
import { PermissionsAndroid, Platform } from 'react-native';
import { getIncomingCalls, PetipyApiError } from '@/lib/petipy-api';

const POLL_INTERVAL_MS = 10_000;

async function ensureForegroundNotificationPermission() {
  if (Platform.OS !== 'android') return false;
  if (Number(Platform.Version) < 33) return true;

  const permission = PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS;
  const result = await PermissionsAndroid.request(permission);
  return result === PermissionsAndroid.RESULTS.GRANTED;
}

export async function requestAvailabilityPermissions() {
  return ensureForegroundNotificationPermission();
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
      connectionNoticeShown = false;
      const hasCalls = calls.length > 0;
      await BackgroundService.updateNotification({
        taskTitle: hasCalls
          ? `تماس ورودی مشاوره · ${calls.length}`
          : 'پتی پای؛ آماده‌ی تماس',
        taskDesc: hasCalls
          ? calls.length === 1
            ? 'یک درخواست تماس دارید؛ برای پاسخ، برنامه را باز کنید.'
            : `${calls.length} درخواست تماس دارید؛ برای پاسخ، برنامه را باز کنید.`
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
}

export async function startAvailabilityService(
  sessionToken: string,
  tokenExpiresAt: string,
) {
  if (Platform.OS !== 'android' || BackgroundService.isRunning()) return;
  if (!Number.isFinite(Date.parse(tokenExpiresAt)) || Date.parse(tokenExpiresAt) <= Date.now()) {
    throw new Error('نشست مشاور منقضی شده است؛ دوباره وارد شوید.');
  }
  const permissionGranted = await ensureForegroundNotificationPermission();
  if (!permissionGranted) {
    throw new Error('برای اجرای سرویس تماس، مجوز اعلان Android لازم است.');
  }

  await BackgroundService.start(monitorIncomingCalls, {
    taskName: 'PetipyConsultantAvailability',
    taskTitle: 'پتی پای؛ آماده‌ی تماس',
    taskDesc: 'در انتظار درخواست مشاوره',
    taskIcon: { name: 'ic_launcher', type: 'mipmap' },
    color: '#6b3fe1',
    linkingURI: 'petipy-consultant:///',
    foregroundServiceType: ['connectedDevice', 'microphone'],
    parameters: { sessionToken, tokenExpiresAt },
  });
}

export async function stopAvailabilityService() {
  if (Platform.OS === 'android' && BackgroundService.isRunning()) {
    await BackgroundService.stop();
  }
}
