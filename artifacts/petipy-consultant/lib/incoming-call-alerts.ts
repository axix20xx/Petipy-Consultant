import notifee, {
  AndroidCategory,
  AndroidImportance,
  AndroidVisibility,
  EventType,
  type Notification,
} from '@notifee/react-native';
import InCallManager from 'react-native-incall-manager';
import { Platform } from 'react-native';

const INCOMING_CALL_CHANNEL_ID = 'petipy-incoming-calls-v1';
const NOTIFICATION_PREFIX = 'petipy-incoming-call-';

function notificationId(callId: string) {
  return `${NOTIFICATION_PREFIX}${callId}`;
}

export async function prepareIncomingCallAlerts() {
  if (Platform.OS !== 'android') return;
  await notifee.createChannel({
    id: INCOMING_CALL_CHANNEL_ID,
    name: 'تماس‌های ورودی مشاوره',
    description: 'اعلان و زنگ درخواست تماس مشاوره',
    importance: AndroidImportance.HIGH,
    sound: 'default',
    vibration: false,
    visibility: AndroidVisibility.PUBLIC,
  });
}

export async function notifyIncomingCall(callId: string) {
  if (Platform.OS !== 'android') return;
  await notifee.displayNotification({
    id: notificationId(callId),
    title: 'تماس ورودی Petipy',
    body: 'درخواست مشاوره جدید دارید. برای پاسخ، برنامه را باز کنید.',
    data: { type: 'incoming-call', callId },
    android: {
      channelId: INCOMING_CALL_CHANNEL_ID,
      category: AndroidCategory.CALL,
      importance: AndroidImportance.HIGH,
      visibility: AndroidVisibility.PUBLIC,
      smallIcon: 'ic_launcher',
      color: '#6b3fe1',
      lightUpScreen: true,
      autoCancel: true,
      pressAction: { id: 'default' },
      fullScreenAction: { id: 'incoming-call' },
    },
  });
}

export async function cancelIncomingCallNotification(callId: string) {
  if (Platform.OS !== 'android') return;
  await notifee.cancelNotification(notificationId(callId));
}

export async function clearIncomingCallNotifications() {
  if (Platform.OS !== 'android') return;
  const displayed = await notifee.getDisplayedNotifications();
  const incoming = displayed.filter(
    ({ notification }) => notification.data?.type === 'incoming-call',
  );
  await Promise.all(
    incoming.map(({ notification }) =>
      notification.id
        ? notifee.cancelNotification(notification.id)
        : Promise.resolve(),
    ),
  );
}

export function startIncomingCallRingtone() {
  if (Platform.OS !== 'android') return;
  InCallManager.startRingtone(
    '_DEFAULT_',
    [0, 700, 450, 700],
    'default',
    0,
  );
}

export function stopIncomingCallRingtone() {
  if (Platform.OS !== 'android') return;
  try {
    InCallManager.stopRingtone();
  } catch {
    // Ring cleanup must not block logout or availability shutdown.
  }
}

export function onIncomingCallNotificationOpen(
  onOpen: (callId: string) => void,
) {
  if (Platform.OS !== 'android') return () => {};

  const openIncomingCall = (data?: Notification['data']) => {
    if (
      data?.type !== 'incoming-call' ||
      typeof data.callId !== 'string' ||
      !data.callId
    ) {
      return;
    }
    onOpen(data.callId);
  };

  const unsubscribe = notifee.onForegroundEvent(({ type, detail }) => {
    if (
      type === EventType.PRESS &&
      detail.notification?.data?.type === 'incoming-call'
    ) {
      const id = detail.notification.id;
      if (id) void notifee.cancelNotification(id).catch(() => {});
      openIncomingCall(detail.notification.data);
    }
  });

  void notifee
    .getInitialNotification()
    .then((initial) => {
      openIncomingCall(initial?.notification.data);
    })
    .catch(() => {});

  return unsubscribe;
}
