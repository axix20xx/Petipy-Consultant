import notifee, {
  AndroidImportance,
  EventType,
  type Notification,
} from '@notifee/react-native';
import InCallManager from 'react-native-incall-manager';
import { NativeModules, Platform } from 'react-native';
import { endAllSystemCalls } from '@/lib/system-calling';
import {
  INCOMING_CALL_ANSWER_ACTION,
  INCOMING_CALL_CHANNEL_ID,
  INCOMING_CALL_FULL_SCREEN_ACTION,
  INCOMING_CALL_PRESS_ACTION,
  isIncomingCallRejectAction,
  isIncomingCallAnswerAction,
  shouldOpenIncomingCallFromNotificationEvent,
} from '@/lib/incoming-call-alert-config';

const NOTIFICATION_PREFIX = 'petipy-incoming-call-';

type PetipyCallNotificationModule = {
  prepareIncomingCallChannel(): Promise<boolean>;
  showIncomingCallNotification(
    callId: string,
    expiresAtMillis?: number | null,
  ): Promise<boolean>;
  cancelIncomingCallNotification(callId: string): Promise<boolean>;
  cancelAllIncomingCallNotifications(): Promise<boolean>;
  startNativeIncomingRingtone?(
    expiresAtMillis?: number | null,
  ): Promise<boolean>;
  stopNativeIncomingRingtone?(): Promise<boolean>;
};

const nativeCallNotifications = NativeModules
  .PetipyFullScreenAccess as PetipyCallNotificationModule | undefined;

function notificationId(callId: string) {
  return `${NOTIFICATION_PREFIX}${callId}`;
}

export async function prepareIncomingCallAlerts() {
  if (Platform.OS !== 'android') return;
  if (!nativeCallNotifications?.prepareIncomingCallChannel) {
    throw new Error('Native Android call notifications are unavailable.');
  }
  await nativeCallNotifications.prepareIncomingCallChannel();
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

export async function notifyIncomingCall(
  callId: string,
  expiresAt?: string,
) {
  if (Platform.OS !== 'android') return;
  if (!nativeCallNotifications?.showIncomingCallNotification) {
    throw new Error('Native Android call notifications are unavailable.');
  }
  const shown = await nativeCallNotifications.showIncomingCallNotification(
    callId,
    expiresAt ? Date.parse(expiresAt) : null,
  );
  if (!shown) {
    throw new Error('Android notification permission is disabled.');
  }
}

export async function cancelIncomingCallNotification(callId: string) {
  if (Platform.OS !== 'android') return;
  await Promise.all([
    notifee.cancelNotification(notificationId(callId)),
    nativeCallNotifications?.cancelIncomingCallNotification(callId),
  ]);
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
  await Promise.all([
    nativeCallNotifications?.cancelAllIncomingCallNotifications(),
    endAllSystemCalls('missed'),
  ]);
}

export function startIncomingCallRingtone(expiresAt?: string) {
  if (Platform.OS !== 'android') return;
  const expiry = expiresAt ? Date.parse(expiresAt) : null;
  const startNative = nativeCallNotifications?.startNativeIncomingRingtone;
  if (startNative) {
    void startNative(expiry).then((started) => {
      if (!started) {
        InCallManager.startRingtone(
          '_DEFAULT_',
          [0, 700, 450, 700],
          'default',
          0,
        );
      }
    }).catch(() => {
      InCallManager.startRingtone(
        '_DEFAULT_',
        [0, 700, 450, 700],
        'default',
        0,
      );
    });
    return;
  }
  InCallManager.startRingtone('_DEFAULT_', [0, 700, 450, 700], 'default', 0);
}

export function stopIncomingCallRingtone() {
  if (Platform.OS !== 'android') return;
  void nativeCallNotifications?.stopNativeIncomingRingtone?.().catch(() => {});
  try {
    InCallManager.stopRingtone();
  } catch {
    // Ring cleanup must not block logout or availability shutdown.
  }
}

export function onIncomingCallNotificationOpen(
  onOpen: (callId: string, action: 'answer' | 'reject' | 'open') => void,
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
    const action = isIncomingCallAnswerAction(actionId)
      ? 'answer'
      : isIncomingCallRejectAction(actionId)
        ? 'reject'
        : 'open';
    onOpen(data.callId, action);
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
