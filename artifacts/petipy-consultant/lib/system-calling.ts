import { NativeModules, Platform } from 'react-native';

type TelecomCallModule = {
  registerSystemPhoneAccount?: () => Promise<boolean>;
  addSystemIncomingCall?: (
    callId: string,
    expiresAtMillis?: number | null,
  ) => Promise<boolean>;
  markSystemCallActive?: (callId: string) => Promise<boolean>;
  endSystemCall?: (callId: string, reason: string) => Promise<boolean>;
  endAllSystemCalls?: (reason: string) => Promise<boolean>;
};

const nativeTelecom = NativeModules.PetipyFullScreenAccess as
  | TelecomCallModule
  | undefined;

const CALL_ID_PATTERN = /^[A-Za-z0-9_-]{12,64}$/;

export async function registerSystemCalling() {
  if (Platform.OS !== 'android' || !nativeTelecom?.registerSystemPhoneAccount) {
    return false;
  }
  try {
    return Boolean(await nativeTelecom.registerSystemPhoneAccount());
  } catch {
    return false;
  }
}

export async function reportSystemIncomingCall(
  callId: string,
  expiresAt?: string,
) {
  if (
    Platform.OS !== 'android' ||
    !nativeTelecom?.addSystemIncomingCall ||
    !CALL_ID_PATTERN.test(callId)
  ) {
    return false;
  }
  try {
    return Boolean(
      await nativeTelecom.addSystemIncomingCall(
        callId,
        expiresAt ? Date.parse(expiresAt) : null,
      ),
    );
  } catch {
    return false;
  }
}

export async function markSystemCallActive(callId: string) {
  if (Platform.OS !== 'android' || !nativeTelecom?.markSystemCallActive) {
    return false;
  }
  try {
    return Boolean(await nativeTelecom.markSystemCallActive(callId));
  } catch {
    return false;
  }
}

export async function endSystemCall(
  callId: string,
  reason: 'rejected' | 'missed' | 'remote' | 'local' = 'local',
) {
  if (Platform.OS !== 'android' || !nativeTelecom?.endSystemCall) return false;
  try {
    return Boolean(await nativeTelecom.endSystemCall(callId, reason));
  } catch {
    return false;
  }
}

export async function endAllSystemCalls(
  reason: 'missed' | 'local' = 'missed',
) {
  if (Platform.OS !== 'android' || !nativeTelecom?.endAllSystemCalls) {
    return false;
  }
  try {
    return Boolean(await nativeTelecom.endAllSystemCalls(reason));
  } catch {
    return false;
  }
}
