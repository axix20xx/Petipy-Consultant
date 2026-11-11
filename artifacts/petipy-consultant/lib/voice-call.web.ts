import type { CallSession } from '@/lib/petipy-api';
import type { VoiceCallCallbacks } from '@/lib/voice-call';

export class VoiceCallClient {
  async start(_session: CallSession, callbacks: VoiceCallCallbacks) {
    callbacks.onError('تماس صوتی فقط در برنامه‌ی Android پشتیبانی می‌شود.');
  }

  setMuted(_muted: boolean) {}
  async setAudioRoute(_route: 'earpiece' | 'speaker', _callId: string) {
    return false;
  }
  acknowledgePetCards() {
    return false;
  }
  close(_sendHangup = false) {}
}
