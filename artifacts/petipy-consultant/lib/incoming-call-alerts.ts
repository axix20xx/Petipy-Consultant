import notifee, {
  AndroidCategory,
  AndroidImportance,
  AndroidVisibility,
  EventType,
  type Notification,
} from '@notifee/react-native';
import InCallManager from 'react-native-incall-manager';
import { Platform } from 'react-native';
import {
  INCOMING_CALL_ANSWER_ACTION,
  INCOMING_CALL_CHANNEL_ID,
  INCOMING_CALL_FULL_SCREEN_ACTION,
  INCOMING_CALL_PRESS_ACTION,
  isIncomingCallAnswerAction,
  shouldOpenIncomingCallFromNotificationEvent,
} from '@/lib/incoming-call-alert-config';

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

export async function getIncomingCallChannelStatus():
  Promise<
    | 'high'
    | 'high-silent'
    | 'low'
    | 'low-silent'
    | 'blocked'
    | 'missing'
    | 'unavailable'
  > {
  if (Platform.OS !== 'android') return 'unavailable';
  try {
    const channel = await notifee.getChannel(INCOMING_CALL_CHANNEL_ID);
    if (!channel) return 'missing';
    if (channel.blocked) return 'blocked';
    const importance = channel.importance ?? AndroidImportance.DEFAULT;
    const highPriority = importance >= AndroidImportance.HIGH;
    const soundEnabled = Boolean(channel.soundURI);
    if (highPriority) return soundEnabled ? 'high' : 'high-silent';
    return soundEnabled ? 'low' : 'low-silent';
  } catch {
    return 'unavailable';
  }
}

export async function openIncomingCallChannelSettings() {
  if (Platform.OS !== 'android') return;
  await notifee.openNotificationSettings(INCOMING_CALL_CHANNEL_ID);
}

export async function notifyIncomingCall(callId: string) {
  if (Platform.OS !== 'android') return;
  await notifee.displayNotification({
    id: notificationId(callId),
    title: 'تماس ورودی Petipy',
    body: 'درخواست مشاوره جدید دارید. برای پاسخ، دکمه‌ی «پاسخ» را بزنید.',
    data: { type: 'incoming-call', callId },
    android: {
      channelId: INCOMING_CALL_CHANNEL_ID,
      category: AndroidCategory.CALL,
      importance: AndroidImportance.HIGH,
      visibility: AndroidVisibility.PUBLIC,
      sound: 'default',
      smallIcon: 'ic_launcher',
      color: '#6b3fe1',
      lightUpScreen: true,
      autoCancel: true,
      actions: [
        {
          title: 'پاسخ',
          pressAction: INCOMING_CALL_ANSWER_ACTION,
        },
      ],
      pressAction: INCOMING_CALL_PRESS_ACTION,
      fullScreenAction: INCOMING_CALL_FULL_SCREEN_ACTION,
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
  onOpen: (callId: string, shouldAnswer: boolean) => void,
) {
  if (Platform.OS !== 'android') return () => {};

  const openIncomingCall = (
    data?: Notification['data'],
    actionId?: unknown,
  ) => {
    if (
      data?.type !== 'incoming-call' ||
      typeof data.callId !== 'string' ||
      !data.callId
    ) {
      return;
    }
    onOpen(data.callId, isIncomingCallAnswerAction(actionId));
  };

  const unsubscribe = notifee.onForegroundEvent(({ type, detail }) => {
    const notification = detail.notification;
    const eventKind =
      type === EventType.PRESS
        ? 'press'
        : type === EventType.ACTION_PRESS
          ? 'action_press'
          : 'other';
    if (
      notification &&
      shouldOpenIncomingCallFromNotificationEvent(
        eventKind,
        notification.data?.type,
        notification.android?.fullScreenAction?.id,
      ) &&
      typeof notification.data?.callId === 'string' &&
      notification.data.callId
    ) {
      const id = notification.id;
      if (id) void notifee.cancelNotification(id).catch(() => {});
      openIncomingCall(notification.data, detail.pressAction?.id);
    }
  });

  void notifee
    .getInitialNotification()
    .then((initial) => {
      openIncomingCall(
        initial?.notification.data,
        initial?.pressAction.id,
      );
    })
    .catch(() => {});

  return unsubscribe;
}
