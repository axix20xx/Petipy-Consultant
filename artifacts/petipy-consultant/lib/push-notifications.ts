export type PushSetupState =
  | 'idle'
  | 'registering'
  | 'ready'
  | 'server-disabled'
  | 'status-unknown'
  | 'permission-denied'
  | 'error'
  | 'unsupported';

export type PushStatusListener = (
  state: PushSetupState,
  message: string,
) => void;

export function startPushRegistration(
  _sessionToken: string,
  onStatus: PushStatusListener,
): () => void {
  onStatus('unsupported', 'اعلان FCM فقط در نسخه‌ی Android فعال است.');
  return () => {};
}

export function listenForForegroundIncomingPush(
  _sessionToken: string,
  _onIncomingCall: (callId: string) => void,
): () => void {
  return () => {};
}

export function stopPushRegistration() {}

export async function revokePushDeviceForSession(
  _sessionToken: string,
): Promise<boolean> {
  return true;
}

export async function handleBackgroundIncomingMessage(
  _message: { data?: Record<string, unknown> },
): Promise<void> {}
