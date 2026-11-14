import assert from 'node:assert/strict';
import { test } from 'node:test';
import { setCallKitAudioRoute } from '../lib/callkit-audio-control';

test('applies the iOS CallKit speaker override to the matching call', async () => {
  let override: boolean | null = null;
  const result = await setCallKitAudioRoute('call_123', 'speaker', {
    getActiveCallSession: async () => ({
      incomingCallEvent: { serverCallId: 'call_123' },
    }),
    setAudioSessionPortOverride: (enabled) => {
      override = enabled;
    },
  });

  assert.equal(result, true);
  assert.equal(override, true);
});

test('clears the iOS speaker override when selecting the earpiece', async () => {
  let override: boolean | null = true;
  const result = await setCallKitAudioRoute('call_123', 'earpiece', {
    getActiveCallSession: async () => ({
      incomingCallEvent: { serverCallId: 'call_123' },
    }),
    setAudioSessionPortOverride: (enabled) => {
      override = enabled;
    },
  });

  assert.equal(result, true);
  assert.equal(override, false);
});

test('does not change audio for a different or missing CallKit session', async () => {
  let changed = false;
  const result = await setCallKitAudioRoute('call_123', 'speaker', {
    getActiveCallSession: async () => ({
      incomingCallEvent: { serverCallId: 'other_call' },
    }),
    setAudioSessionPortOverride: () => {
      changed = true;
    },
  });

  assert.equal(result, false);
  assert.equal(changed, false);
});
