export type MicrophonePermission =
  | 'granted'
  | 'denied'
  | 'prompt'
  | 'unavailable';

export function normalizeMicrophonePermission(
  value: unknown,
): MicrophonePermission {
  if (value === true || value === 'granted') return 'granted';
  if (value === false || value === 'denied') return 'denied';
  if (value === 'prompt') return 'prompt';
  return 'unavailable';
}
