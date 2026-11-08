import type { IncomingCall } from './petipy-api';

export type IncomingPushRoute = {
  callId: string;
  path: string;
};

export function parseIncomingCallId(data: unknown): string | null {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  const payload = data as Record<string, unknown>;
  const nestedData =
    payload.data !== null &&
    typeof payload.data === 'object' &&
    !Array.isArray(payload.data)
      ? (payload.data as Record<string, unknown>)
      : {};

  for (const source of [payload, nestedData]) {
    for (const key of ['callId', 'call_id', 'requestId', 'request_id']) {
      const value = source[key];
      if (typeof value !== 'string') continue;
      const normalized = value.trim();
      if (normalized.length > 0 && normalized.length <= 200) return normalized;
    }
  }
  return null;
}

export function isUnexpiredRequestedCall(
  call: IncomingCall,
  now = Date.now(),
): boolean {
  if (call.status !== 'requested' || typeof call.expiresAt !== 'string') {
    return false;
  }
  const expiresAt = Date.parse(call.expiresAt);
  return Number.isFinite(expiresAt) && expiresAt > now;
}

export function findActiveIncomingCall(
  requests: IncomingCall[],
  callId: string,
  now = Date.now(),
): IncomingCall | null {
  const call = requests.find((request) => request.id === callId);
  return call && isUnexpiredRequestedCall(call, now) ? call : null;
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
