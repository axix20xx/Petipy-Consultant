import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createForegroundCallKitEvent } from '../lib/ios-callkit-event';

test('builds a minimal CallKit event from the authenticated incoming-call record', () => {
  const event = createForegroundCallKitEvent(
    {
      id: 'call_opaque_123',
      callerName: 'Petipy customer',
      createdAt: '2026-11-14T10:00:00.000Z',
      expiresAt: '2026-11-14T10:01:30.000Z',
    },
    'b3404d48-cc48-44a4-81f8-76a08770a7ac',
  );

  assert.equal(event.eventId, 'b3404d48-cc48-44a4-81f8-76a08770a7ac');
  assert.equal(event.serverCallId, 'call_opaque_123');
  assert.equal(event.caller.id, 'call_opaque_123');
  assert.equal(event.caller.displayName, 'Petipy customer');
  assert.equal(event.hasVideo, false);
  assert.equal(event.supportsHolding, false);
  assert.equal(event.supportsDTMF, false);
  assert.equal(event.startedAt, '2026-11-14T10:00:00.000Z');
  assert.equal('phoneNumber' in event.caller, false);
  assert.equal('token' in event, false);
  assert.equal('expiresAt' in event, false);
});

test('uses a safe generic caller label when the API name is blank', () => {
  const event = createForegroundCallKitEvent(
    { id: 'call_opaque_456', callerName: '   ' },
    'a3b14c84-444c-4ff7-8ebc-f12bc4ad5a94',
  );

  assert.equal(event.caller.displayName, 'تماس مشاوره Petipy');
});
