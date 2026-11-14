import assert from 'node:assert/strict';
import { test } from 'node:test';
import { normalizeMicrophonePermission } from '../lib/microphone-permission';

test('normalizes microphone permission states for iOS and Android', () => {
  assert.equal(normalizeMicrophonePermission(true), 'granted');
  assert.equal(normalizeMicrophonePermission('granted'), 'granted');
  assert.equal(normalizeMicrophonePermission(false), 'denied');
  assert.equal(normalizeMicrophonePermission('denied'), 'denied');
  assert.equal(normalizeMicrophonePermission('prompt'), 'prompt');
  assert.equal(normalizeMicrophonePermission(undefined), 'unavailable');
});
