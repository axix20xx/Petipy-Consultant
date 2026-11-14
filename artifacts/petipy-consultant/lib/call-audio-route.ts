export type CallAudioRoute =
  | 'earpiece'
  | 'speaker'
  | 'bluetooth'
  | 'external';

type AudioOutput = { portType?: string };

const BLUETOOTH_PORTS = new Set([
  'bluetoothA2DP',
  'bluetoothLE',
  'bluetoothHFP',
]);

const EXTERNAL_PORTS = new Set([
  'airPlay',
  'carAudio',
  'headphones',
  'hdmi',
  'lineOut',
  'usbAudio',
]);

export function resolveCallAudioRoute(
  outputs: readonly AudioOutput[],
): CallAudioRoute {
  if (outputs.some((output) => output.portType === 'builtInSpeaker')) {
    return 'speaker';
  }
  if (outputs.some((output) => BLUETOOTH_PORTS.has(output.portType ?? ''))) {
    return 'bluetooth';
  }
  if (outputs.some((output) => EXTERNAL_PORTS.has(output.portType ?? ''))) {
    return 'external';
  }
  return 'earpiece';
}
