export const INCOMING_CALL_CHANNEL_ID = 'incoming-calls-v2';

export const INCOMING_CALL_FULL_SCREEN_ACTION = {
  id: 'incoming-call',
  launchActivity: 'default',
} as const;

export const INCOMING_CALL_PRESS_ACTION = {
  id: 'default',
  launchActivity: 'default',
} as const;
