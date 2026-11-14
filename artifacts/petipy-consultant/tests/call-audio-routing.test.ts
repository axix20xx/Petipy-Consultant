import assert from 'node:assert/strict';
import { test } from 'node:test';
import { resolveCallAudioBackend } from '../lib/call-audio-routing';

test('uses CallKit audio only for an iOS call actually owned by CallKit', () => {
  assert.equal(resolveCallAudioBackend('ios', true), 'callkit');
  assert.equal(resolveCallAudioBackend('ios', false), 'incall-manager');
});

test('uses the native in-call audio manager for Android calls', () => {
  assert.equal(resolveCallAudioBackend('android', false), 'incall-manager');
  assert.equal(resolveCallAudioBackend('android', true), 'incall-manager');
});

test('does not attempt native call audio routing on web', () => {
  assert.equal(resolveCallAudioBackend('web', false), 'none');
});
