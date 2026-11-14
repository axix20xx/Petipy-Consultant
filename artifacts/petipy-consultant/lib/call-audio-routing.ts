export type CallAudioBackend = 'callkit' | 'incall-manager' | 'none';

export function resolveCallAudioBackend(
  platform: string,
  callKitOwnsAudioSession: boolean,
): CallAudioBackend {
  if (platform === 'ios' && callKitOwnsAudioSession) return 'callkit';
  if (platform === 'ios' || platform === 'android') return 'incall-manager';
  return 'none';
}
