import type { CallSession } from 'expo-callkit-telecom';
import { isIosNativeVoipEnabled } from '@/lib/ios-voip-config';

async function getModule() {
  return import('expo-callkit-telecom');
}

async function getMatchingActiveSession(callId: string): Promise<CallSession | null> {
  try {
    const { getActiveCallSession } = await getModule();
    const session = await getActiveCallSession();
    return session?.incomingCallEvent?.serverCallId === callId ? session : null;
  } catch {
    return null;
  }
}

export async function registerSystemCalling() {
  return isIosNativeVoipEnabled();
}

export async function reportSystemIncomingCall() {
  if (!isIosNativeVoipEnabled()) return false;
  // PushKit reports the incoming call to CallKit natively before JavaScript starts.
  return false;
}

export async function markSystemCallActive() {
  if (!isIosNativeVoipEnabled()) return false;
  // CallKit is marked connected only after WebRTC reports a live media connection.
  return true;
}

export async function setSystemCallAudioRoute(
  _callId: string,
  route: 'earpiece' | 'speaker',
) {
  if (!isIosNativeVoipEnabled()) return false;
  try {
    const { setAudioSessionPortOverride } = await getModule();
    setAudioSessionPortOverride(route === 'speaker');
    return true;
  } catch {
    return false;
  }
}

export async function setSystemCallMuted(callId: string, muted: boolean) {
  if (!isIosNativeVoipEnabled()) return false;
  const session = await getMatchingActiveSession(callId);
  if (!session) return false;
  try {
    const { setMuted } = await getModule();
    await setMuted(session.id, muted);
    return true;
  } catch {
    return false;
  }
}

export async function endSystemCall(
  callId: string,
  _reason: 'rejected' | 'missed' | 'remote' | 'local' = 'local',
) {
  if (!isIosNativeVoipEnabled()) return false;
  const session = await getMatchingActiveSession(callId);
  if (!session) return false;
  try {
    const { endCall } = await getModule();
    await endCall(session.id);
    return true;
  } catch {
    return false;
  }
}

export async function endAllSystemCalls() {
  if (!isIosNativeVoipEnabled()) return false;
  try {
    const { endCall, getActiveCallSession } = await getModule();
    const session = await getActiveCallSession();
    if (!session) return true;
    await endCall(session.id);
    return true;
  } catch {
    return false;
  }
}
