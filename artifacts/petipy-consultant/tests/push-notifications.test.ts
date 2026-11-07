import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  findActiveIncomingCall,
  parseIncomingCallId,
  resolveIncomingPushRoute,
} from '../lib/incoming-push-routing';

const now = Date.parse('2026-11-07T12:00:00.000Z');

const activeRequest = {
  id: 'call-123',
  callerName: 'Test caller',
  status: 'requested',
  expiresAt: '2026-11-07T12:01:00.000Z',
};

test('only accepts a bounded non-empty callId signal', () => {
  assert.equal(parseIncomingCallId({ callId: ' call-123 ' }), 'call-123');
  assert.equal(parseIncomingCallId({ callId: '' }), null);
  assert.equal(parseIncomingCallId({ callId: 42 }), null);
  assert.equal(parseIncomingCallId({ callId: 'x'.repeat(201) }), null);
  assert.equal(parseIncomingCallId({ token: 'must-not-be-used' }), null);
});

test('opens a route only for a current requested call from the API queue', () => {
  const route = resolveIncomingPushRoute(
    [activeRequest],
    { callId: 'call-123' },
    now,
  );
  assert.deepEqual(route, {
    callId: 'call-123',
    path: '/incoming-call/call-123',
  });
});

test('rejects a call signal not present in the authenticated request queue', () => {
  assert.equal(
    resolveIncomingPushRoute([], { callId: 'call-123' }, now),
    null,
  );
});

test('rejects expired or non-requested calls', () => {
  assert.equal(
    findActiveIncomingCall(
      [{ ...activeRequest, expiresAt: '2026-11-07T11:59:59.000Z' }],
      'call-123',
      now,
    ),
    null,
  );
  assert.equal(
    findActiveIncomingCall(
      [{ ...activeRequest, status: 'completed' }],
      'call-123',
      now,
    ),
    null,
  );
});

test('URL-encodes call IDs before routing', () => {
  const route = resolveIncomingPushRoute(
    [{ ...activeRequest, id: 'call/with space' }],
    { callId: 'call/with space' },
    now,
  );
  assert.equal(route?.path, '/incoming-call/call%2Fwith%20space');
});
