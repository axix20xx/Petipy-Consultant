export const INCOMING_CALL_CHANNEL_ID = 'incoming-calls-v3';

export const INCOMING_CALL_FULL_SCREEN_ACTION = {
  id: 'incoming-call',
  launchActivity: 'default',
} as const;

export const INCOMING_CALL_PRESS_ACTION = {
  id: 'default',
  launchActivity: 'default',
} as const;

export function shouldOpenIncomingCallFromNotificationEvent(
  eventKind: 'press' | 'action_press' | 'other',
  notificationType: unknown,
  fullScreenActionId?: unknown,
) {
  return (
    notificationType === 'incoming-call' &&
    (eventKind === 'press' ||
      eventKind === 'action_press' ||
      fullScreenActionId === INCOMING_CALL_FULL_SCREEN_ACTION.id)
  );
}
