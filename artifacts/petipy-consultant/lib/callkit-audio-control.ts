type CallKitSession = {
  incomingCallEvent?: { serverCallId?: string } | null;
} | null;

export type CallKitAudioAdapter = {
  getActiveCallSession: () => Promise<CallKitSession>;
  setAudioSessionPortOverride: (speakerEnabled: boolean) => void;
};

export async function setCallKitAudioRoute(
  callId: string,
  route: 'earpiece' | 'speaker',
  adapter: CallKitAudioAdapter,
): Promise<boolean> {
  try {
    const session = await adapter.getActiveCallSession();
    if (session?.incomingCallEvent?.serverCallId !== callId) return false;
    adapter.setAudioSessionPortOverride(route === 'speaker');
    return true;
  } catch {
    return false;
  }
}
