import assert from 'node:assert/strict';
import test from 'node:test';
import {
  canReceiveForegroundCall,
  getIosCallRecoveryMode,
} from '../lib/ios-call-recovery';

test('keeps a healthy active call untouched on foreground return', () => {
  assert.equal(getIosCallRecoveryMode(true, 'connected'), 'none');
});

test('rejoins signaling without rebuilding healthy media when socket closed', () => {
  assert.equal(getIosCallRecoveryMode(false, 'connected'), 'signaling');
});

test('rebuilds media when peer connection is no longer usable', () => {
  for (const state of ['disconnected', 'failed', 'closed'] as const) {
    assert.equal(getIosCallRecoveryMode(true, state), 'media');
  }
});

test('requires API, CallKit, microphone, and online state for foreground readiness', () => {
  const ready = {
    apiReachable: true,
    callKitAvailable: true,
    microphoneGranted: true,
    consultantOnline: true,
  };
  assert.equal(canReceiveForegroundCall(ready), true);

  for (const key of Object.keys(ready) as (keyof typeof ready)[]) {
    assert.equal(canReceiveForegroundCall({ ...ready, [key]: false }), false);
  }
});
