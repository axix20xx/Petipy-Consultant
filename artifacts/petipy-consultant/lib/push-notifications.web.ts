export type { PushSetupState, PushStatusListener } from './push-notifications';
import type { PushStatusListener } from './push-notifications';

export function startPushRegistration(
  _sessionToken: string,
  onStatus: PushStatusListener,
) {
  onStatus('unsupported', 'اعلان FCM فقط در نسخه‌ی Android فعال است.');
  return () => {};
}

export function listenForForegroundIncomingPush(
  _sessionToken: string,
  _onIncomingCall: (callId: string) => void,
) {
  return () => {};
}

export function stopPushRegistration() {}

export async function revokePushDeviceForSession(
  _sessionToken: string,
): Promise<boolean> {
  return true;
}
