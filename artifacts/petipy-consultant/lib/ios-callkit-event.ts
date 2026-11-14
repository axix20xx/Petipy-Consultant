import type { IncomingCallEvent } from 'expo-callkit-telecom';
import type { IncomingCall } from '@/lib/petipy-api';

export function createForegroundCallKitEvent(
  call: IncomingCall,
  eventId: string,
): IncomingCallEvent {
  const callerName = call.callerName.trim() || 'تماس مشاوره Petipy';

  return {
    eventId,
    serverCallId: call.id,
    caller: {
      // The API request ID is an opaque per-call identifier, not a phone number.
      id: call.id,
      displayName: callerName,
    },
    hasVideo: false,
    supportsHolding: false,
    supportsDTMF: false,
    ...(call.createdAt ? { startedAt: call.createdAt } : {}),
  };
}
