import type { CallSession } from 'expo-callkit-telecom';
import * as Crypto from 'expo-crypto';
import { createForegroundCallKitEvent } from '@/lib/ios-callkit-event';
import type { IncomingCall } from '@/lib/petipy-api';

async function getModule() {
  return import('expo-callkit-telecom');
}

const reportingCalls = new Map<string, Promise<boolean>>();
const reportedCallIds = new Set<string>();
const suppressedCallIds = new Set<string>();

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
  try {
    await getModule();
    return true;
  } catch {
    return false;
  }
}

export async function reportSystemIncomingCall(
  callId: string,
  _expiresAt?: string,
  callerName?: string,
) {
  if (!callId || suppressedCallIds.has(callId)) return false;
  if (reportedCallIds.has(callId)) return true;

  const existingRequest = reportingCalls.get(callId);
  if (existingRequest) return existingRequest;

  const request = (async () => {
    try {
      const callkit = await getModule();
      const existingSession = await getMatchingActiveSession(callId);
      if (existingSession) {
        reportedCallIds.add(callId);
        return true;
      }

      const call: IncomingCall = {
        id: callId,
        callerName: callerName?.trim() || 'تماس مشاوره Petipy',
      };
      await callkit.reportIncomingCall(
        createForegroundCallKitEvent(call, Crypto.randomUUID()),
      );
      reportedCallIds.add(callId);
      return true;
    } catch {
      return false;
    } finally {
      reportingCalls.delete(callId);
    }
  })();

  reportingCalls.set(callId, request);
  return request;
}

export function suppressSystemIncomingCall(callId: string) {
  if (callId) suppressedCallIds.add(callId);
}

export function isSystemIncomingCallSuppressed(callId: string) {
  return suppressedCallIds.has(callId);
}

export function clearSystemIncomingCallSuppression(callId: string) {
  suppressedCallIds.delete(callId);
}

export async function markSystemCallActive(callId: string) {
  return Boolean(await getMatchingActiveSession(callId));
}

export async function setSystemCallAudioRoute(
  callId: string,
  route: 'earpiece' | 'speaker',
) {
  if (!(await getMatchingActiveSession(callId))) return false;
  try {
    const { setAudioSessionPortOverride } = await getModule();
    setAudioSessionPortOverride(route === 'speaker');
    return true;
  } catch {
    return false;
  }
}

export async function setSystemCallMuted(callId: string, muted: boolean) {
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
  reason: 'rejected' | 'missed' | 'remote' | 'local' = 'local',
) {
  const session = await getMatchingActiveSession(callId);
  reportedCallIds.delete(callId);
  if (!session) return true;
  try {
    const callkit = await getModule();
    if (reason === 'local') {
      await callkit.endCall(session.id);
    } else {
      const endedReason =
        reason === 'missed'
          ? 'unanswered'
          : reason === 'rejected'
            ? 'declinedElsewhere'
            : 'remoteEnded';
      await callkit.reportCallEnded(session.id, endedReason);
    }
    return true;
  } catch {
    return false;
  }
}

export async function endAllSystemCalls(reason: 'missed' | 'local' = 'missed') {
  try {
    const { getActiveCallSession, reportCallEnded } = await getModule();
    const session = await getActiveCallSession();
    if (!session) return true;
    if (reason === 'local') {
      const { endCall } = await getModule();
      await endCall(session.id);
    } else {
      await reportCallEnded(session.id, 'unanswered');
    }
    const callId = session.incomingCallEvent?.serverCallId;
    if (callId) {
      reportedCallIds.delete(callId);
      suppressedCallIds.delete(callId);
    }
    return true;
  } catch {
    return false;
  }
}
