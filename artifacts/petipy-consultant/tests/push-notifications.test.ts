import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  findActiveIncomingCall,
  isUnexpiredRequestedCall,
  parseIncomingCallId,
  resolveIncomingPushRoute,
} from '../lib/incoming-push-routing';
import {
  INCOMING_CALL_ANSWER_ACTION,
  INCOMING_CALL_CHANNEL_ID,
  INCOMING_CALL_FULL_SCREEN_ACTION,
  INCOMING_CALL_PRESS_ACTION,
  INCOMING_CALL_REJECT_ACTION,
  MAX_INCOMING_RING_DURATION_MS,
  getIncomingRingtoneDeadline,
  isIncomingCallAnswerAction,
  isIncomingCallRejectAction,
  shouldOpenIncomingCallFromNotificationEvent,
} from '../lib/incoming-call-alert-config';

const now = Date.parse('2026-11-07T12:00:00.000Z');

const activeRequest = {
  id: 'call-123',
  callerName: 'Test caller',
  status: 'requested',
  expiresAt: '2026-11-07T12:01:00.000Z',
};

test('uses a new high-priority incoming-call channel for Android', () => {
  assert.equal(INCOMING_CALL_CHANNEL_ID, 'incoming-calls-v2');
});

test('routes incoming calls from notification and full-screen action events', () => {
  assert.equal(
    shouldOpenIncomingCallFromNotificationEvent(
      'press',
      'incoming-call',
    ),
    true,
  );
  assert.equal(
    shouldOpenIncomingCallFromNotificationEvent(
      'action_press',
      'incoming-call',
    ),
    true,
  );
  assert.equal(
    shouldOpenIncomingCallFromNotificationEvent(
      'other',
      'incoming-call',
      INCOMING_CALL_FULL_SCREEN_ACTION.id,
    ),
    true,
  );
  assert.equal(
    shouldOpenIncomingCallFromNotificationEvent(
      'action_press',
      'not-an-incoming-call',
      INCOMING_CALL_FULL_SCREEN_ACTION.id,
    ),
    false,
  );
});

test('only accepts a bounded non-empty callId signal', () => {
  assert.equal(parseIncomingCallId({ callId: ' call-123 ' }), 'call-123');
  assert.equal(parseIncomingCallId({ call_id: 'call-123' }), 'call-123');
  assert.equal(parseIncomingCallId({ requestId: 'call-123' }), 'call-123');
  assert.equal(
    parseIncomingCallId({
      incomingCall: { serverCallId: 'call-123' },
    }),
    'call-123',
  );
  assert.equal(
    parseIncomingCallId({ data: { request_id: 'call-123' } }),
    'call-123',
  );
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
  assert.equal(
    findActiveIncomingCall(
      [{ ...activeRequest, status: 'connecting' }],
      'call-123',
      now,
    ),
    null,
  );
  assert.equal(
    findActiveIncomingCall(
      [{ ...activeRequest, expiresAt: undefined }],
      'call-123',
      now,
    ),
    null,
  );
  assert.equal(
    isUnexpiredRequestedCall(
      { ...activeRequest, status: 'active' },
      now,
    ),
    false,
  );
});

test('ring audio deadline never outlives the active request or ring lease', () => {
  assert.equal(
    getIncomingRingtoneDeadline(now, now + 15_000, null),
    now + 15_000,
  );
  assert.equal(
    getIncomingRingtoneDeadline(now, now + 300_000, null),
    now + MAX_INCOMING_RING_DURATION_MS,
  );
  assert.equal(
    getIncomingRingtoneDeadline(now, now + 30_000, now + 10_000),
    now + 10_000,
  );
  assert.equal(getIncomingRingtoneDeadline(now, now, null), null);
  assert.equal(getIncomingRingtoneDeadline(now, null, null), now + MAX_INCOMING_RING_DURATION_MS);
  assert.equal(
    getIncomingRingtoneDeadline(now + 20_000, now + 300_000, now + 10_000),
    now + 20_000 + MAX_INCOMING_RING_DURATION_MS,
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

test('incoming-call notification explicitly launches the default Android activity', () => {
  assert.deepEqual(INCOMING_CALL_ANSWER_ACTION, {
    id: 'answer',
    launchActivity: 'default',
  });
  assert.equal(isIncomingCallAnswerAction('answer'), true);
  assert.equal(isIncomingCallAnswerAction('default'), false);
  assert.deepEqual(INCOMING_CALL_REJECT_ACTION, {
    id: 'reject',
    launchActivity: 'default',
  });
  assert.equal(isIncomingCallRejectAction('reject'), true);
  assert.equal(isIncomingCallRejectAction('default'), false);
  assert.deepEqual(INCOMING_CALL_FULL_SCREEN_ACTION, {
    id: 'incoming-call',
    launchActivity: 'default',
  });
  assert.deepEqual(INCOMING_CALL_PRESS_ACTION, {
    id: 'default',
    launchActivity: 'default',
  });
});
