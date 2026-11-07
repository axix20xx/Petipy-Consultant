import type { IncomingCall } from './petipy-api';

export type IncomingPushRoute = {
  callId: string;
  path: string;
};

export function parseIncomingCallId(data: unknown): string | null {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  const callId = (data as Record<string, unknown>).callId;
  if (typeof callId !== 'string') return null;
  const normalized = callId.trim();
  return normalized.length > 0 && normalized.length <= 200 ? normalized : null;
}

export function findActiveIncomingCall(
  requests: IncomingCall[],
  callId: string,
  now = Date.now(),
): IncomingCall | null {
  const call = requests.find((request) => request.id === callId);
  if (!call || (call.status && call.status !== 'requested')) return null;
  if (call.expiresAt) {
    const expiresAt = Date.parse(call.expiresAt);
    if (Number.isFinite(expiresAt) && expiresAt <= now) return null;
  }
  return call;
}

export function resolveIncomingPushRoute(
  requests: IncomingCall[],
  data: unknown,
  now = Date.now(),
): IncomingPushRoute | null {
  const callId = parseIncomingCallId(data);
  if (!callId || !findActiveIncomingCall(requests, callId, now)) return null;
  return {
    callId,
    path: `/incoming-call/${encodeURIComponent(callId)}`,
  };
}
