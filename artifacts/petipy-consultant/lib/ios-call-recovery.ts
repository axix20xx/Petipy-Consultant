export type CallPeerState =
  | 'new'
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'failed'
  | 'closed';

export type IosCallRecoveryMode = 'none' | 'signaling' | 'media';

export function getIosCallRecoveryMode(
  signalingOpen: boolean,
  peerState: CallPeerState,
): IosCallRecoveryMode {
  if (
    peerState === 'disconnected' ||
    peerState === 'failed' ||
    peerState === 'closed'
  ) {
    return 'media';
  }
  return signalingOpen ? 'none' : 'signaling';
}

export function canReceiveForegroundCall(input: {
  apiReachable: boolean;
  callKitAvailable: boolean;
  microphoneGranted: boolean;
  consultantOnline: boolean;
}) {
  return (
    input.apiReachable &&
    input.callKitAvailable &&
    input.microphoneGranted &&
    input.consultantOnline
  );
}
