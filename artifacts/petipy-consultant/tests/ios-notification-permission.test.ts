import assert from 'node:assert/strict';
import { test } from 'node:test';
import { normalizeIosNotificationPermission } from '../lib/ios-notification-permission';

test('recognizes authorized and provisional iOS notification access', () => {
  assert.equal(
    normalizeIosNotificationPermission({
      granted: true,
      status: 'granted',
      iosStatus: 2,
    }),
    'authorized',
  );
  assert.equal(
    normalizeIosNotificationPermission({
      granted: false,
      status: 'undetermined',
      iosStatus: 3,
    }),
    'provisional',
  );
});

test('recognizes denied and not-yet-requested iOS notification access', () => {
  assert.equal(
    normalizeIosNotificationPermission({
      granted: false,
      status: 'denied',
      iosStatus: 1,
    }),
    'denied',
  );
  assert.equal(
    normalizeIosNotificationPermission({
      granted: false,
      status: 'undetermined',
      iosStatus: 0,
    }),
    'not-determined',
  );
});

test('reports unavailable permission data without guessing', () => {
  assert.equal(
    normalizeIosNotificationPermission({
      granted: false,
      status: 'unknown',
    }),
    'unavailable',
  );
});
