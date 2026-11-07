import BackgroundService from 'react-native-background-actions';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { getIncomingCalls } from '@/lib/petipy-api';

const NOTIFICATION_CHANNEL = 'petipy-incoming-calls';
const POLL_INTERVAL_MS = 10_000;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function ensureNotificationPermission() {
  if (Platform.OS !== 'android') return false;

  await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNEL, {
    name: 'تماس‌های مشاوره',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 300, 150, 300],
    sound: 'default',
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  });

  const existing = await Notifications.getPermissionsAsync();
  const permission = existing.granted
    ? existing
    : await Notifications.requestPermissionsAsync();
  return permission.granted;
}

export async function requestAvailabilityPermissions() {
  return ensureNotificationPermission();
}

async function sleep(milliseconds: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
}

type MonitorParams = { sessionToken: string };

async function monitorIncomingCalls(params?: MonitorParams) {
  if (!params?.sessionToken) return;
  const { sessionToken } = params;
  const seenIds = new Set<string>();
  let connectionNoticeShown = false;

  while (BackgroundService.isRunning()) {
    try {
      const calls = await getIncomingCalls(sessionToken);
      connectionNoticeShown = false;
      await BackgroundService.updateNotification({
        taskTitle: 'پتی پای؛ آماده‌ی تماس',
        taskDesc: 'در انتظار درخواست مشاوره',
      });

      for (const call of calls) {
        if (seenIds.has(call.id)) continue;
        seenIds.add(call.id);
        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'درخواست تماس مشاوره',
            body: call.callerName,
            sound: 'default',
            data: { callId: call.id },
            categoryIdentifier: 'petipy-incoming-call',
          },
          trigger: null,
        });
      }
    } catch {
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

export async function startAvailabilityService(sessionToken: string) {
  if (Platform.OS !== 'android' || BackgroundService.isRunning()) return;
  const permissionGranted = await ensureNotificationPermission();
  if (!permissionGranted) {
    throw new Error('برای اعلان تماس‌های ورودی، مجوز اعلان Android لازم است.');
  }

  await Notifications.setNotificationCategoryAsync('petipy-incoming-call', [
    {
      identifier: 'open',
      buttonTitle: 'نمایش درخواست',
      options: { opensAppToForeground: true },
    },
  ]);

  await BackgroundService.start(monitorIncomingCalls, {
    taskName: 'PetipyConsultantAvailability',
    taskTitle: 'پتی پای؛ آماده‌ی تماس',
    taskDesc: 'در انتظار درخواست مشاوره',
    taskIcon: { name: 'ic_launcher', type: 'mipmap' },
    color: '#6b3fe1',
    linkingURI: 'petipy-consultant:///',
    foregroundServiceType: ['connectedDevice', 'microphone'],
    parameters: { sessionToken },
  });
}

export async function stopAvailabilityService() {
  if (Platform.OS === 'android' && BackgroundService.isRunning()) {
    await BackgroundService.stop();
  }
}
