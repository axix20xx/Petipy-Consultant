export const INCOMING_CALL_CHANNEL_ID = 'incoming-calls-v2';
export const MAX_INCOMING_RING_DURATION_MS = 90_000;

export function getIncomingRingtoneDeadline(
  now: number,
  expiresAt: number | null,
  currentDeadline: number | null,
): number | null {
  if (
    expiresAt !== null &&
    (!Number.isFinite(expiresAt) || expiresAt <= now)
  ) {
    return null;
  }
  const maximumDeadline = now + MAX_INCOMING_RING_DURATION_MS;
  const requestedDeadline = Math.min(expiresAt ?? maximumDeadline, maximumDeadline);
  if (currentDeadline !== null && currentDeadline > now) {
    return Math.min(currentDeadline, requestedDeadline);
  }
  return requestedDeadline;
}

export const INCOMING_CALL_FULL_SCREEN_ACTION = {
  id: 'incoming-call',
  launchActivity: 'default',
} as const;

export const INCOMING_CALL_ANSWER_ACTION = {
  id: 'answer',
  launchActivity: 'default',
} as const;

export const INCOMING_CALL_REJECT_ACTION = {
  id: 'reject',
  launchActivity: 'default',
} as const;

export const INCOMING_CALL_PRESS_ACTION = {
  id: 'default',
  launchActivity: 'default',
} as const;

export function isIncomingCallAnswerAction(actionId?: unknown) {
  return actionId === INCOMING_CALL_ANSWER_ACTION.id;
}

export function isIncomingCallRejectAction(actionId?: unknown) {
  return actionId === INCOMING_CALL_REJECT_ACTION.id;
}

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
