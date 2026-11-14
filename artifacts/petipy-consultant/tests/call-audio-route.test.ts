import assert from 'node:assert/strict';
import { test } from 'node:test';
import { resolveCallAudioRoute } from '../lib/call-audio-route';

test('recognizes the selected audio output', () => {
  assert.equal(
    resolveCallAudioRoute([{ portType: 'builtInSpeaker' }]),
    'speaker',
  );
  assert.equal(
    resolveCallAudioRoute([{ portType: 'bluetoothHFP' }]),
    'bluetooth',
  );
  assert.equal(
    resolveCallAudioRoute([{ portType: 'bluetoothA2DP' }]),
    'bluetooth',
  );
  assert.equal(
    resolveCallAudioRoute([{ portType: 'headphones' }]),
    'external',
  );
  assert.equal(
    resolveCallAudioRoute([{ portType: 'builtInReceiver' }]),
    'earpiece',
  );
  assert.equal(resolveCallAudioRoute([]), 'earpiece');
});
