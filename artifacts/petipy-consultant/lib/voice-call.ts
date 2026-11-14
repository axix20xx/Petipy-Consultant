import InCallManager from 'react-native-incall-manager';
import {
  mediaDevices,
  MediaStream as WebRTCMediaStream,
  RTCPeerConnection,
  type MediaStream,
  type MediaStreamTrack,
  type RTCIceCandidate,
} from 'react-native-webrtc';
import type { CallSession } from '@/lib/petipy-api';
import {
  PET_CARD_SHARED_ACKNOWLEDGEMENT,
  parsePetCardShareMessage,
  type PetCard,
} from '@/lib/pet-card-protocol';
import {
  resolveCallAudioBackend,
  type CallAudioBackend,
} from '@/lib/call-audio-routing';
import { setSystemCallAudioRoute } from '@/lib/system-calling';
import { Platform } from 'react-native';

export type VoiceCallCallbacks = {
  onStatus: (message: string) => void;
  onConnected: () => void;
  onDisconnected: () => void;
  onEnded: () => void;
  onError: (message: string) => void;
  onRemoteVideo: (stream: MediaStream | null) => void;
  onPetCardsReceived: (shareId: number, pets: PetCard[]) => void;
};

type SignalMessage = {
  type: string;
  payload?: unknown;
  from?: string;
};

type NativeWebSocketConstructor = new (
  url: string,
  protocols: string[],
  options?: { headers: Record<string, string> },
) => WebSocket;

function readSignal(data: unknown): SignalMessage | null {
  try {
    const parsed = JSON.parse(String(data)) as unknown;
    if (parsed === null || typeof parsed !== 'object') return null;
    const message = parsed as Record<string, unknown>;
    return typeof message.type === 'string'
      ? {
          type: message.type,
          payload: message.payload,
          from: typeof message.from === 'string' ? message.from : undefined,
        }
      : null;
  } catch {
    return null;
  }
}

export class VoiceCallClient {
  private peer: RTCPeerConnection | null = null;
  private socket: WebSocket | null = null;
  private localStream: MediaStream | null = null;
  private audioBackend: CallAudioBackend = 'none';
  private audioManagerStarted = false;
  private pendingCandidates: RTCIceCandidate[] = [];
  private callbacks: VoiceCallCallbacks | null = null;
  private closed = false;
  private petCardShareSequence = 0;
  private remoteVideoStream: MediaStream | null = null;

  async start(
    session: CallSession,
    callbacks: VoiceCallCallbacks,
    options?: { nativeCallKitRequestId?: string },
  ) {
    this.callbacks = callbacks;
    this.closed = false;
    this.petCardShareSequence = 0;
    this.remoteVideoStream = null;
    callbacks.onStatus('در حال آماده‌سازی تماس امن…');

    if (
      session.iceServers.length === 0 ||
      session.iceServers.some((server) =>
        server.urls.some((url) => !/^turns?:/i.test(url)),
      )
    ) {
      throw new Error('تماس فقط با TURN امن و relay-only مجاز است.');
    }

    const callKitOwnsAudioSession =
      Platform.OS === 'ios' &&
      Boolean(options?.nativeCallKitRequestId);
    this.audioBackend = resolveCallAudioBackend(
      Platform.OS,
      callKitOwnsAudioSession,
    );
    if (this.audioBackend === 'incall-manager') {
      // InCallManager configures AVAudioSession for WebRTC on iOS and keeps
      // the active audio session available when the app moves to the background.
      InCallManager.start({ media: 'audio', auto: true });
      this.audioManagerStarted = true;
    }

    this.localStream = await mediaDevices.getUserMedia({
      audio: true,
      video: false,
    });

    this.peer = new RTCPeerConnection({
      iceServers: session.iceServers,
      iceTransportPolicy: 'relay',
    });

    const audioTrack = this.localStream.getAudioTracks()[0];
    if (!audioTrack) throw new Error('دسترسی به میکروفون برقرار نشد.');
    this.peer.addTrack(audioTrack, this.localStream);

    this.peer.onicecandidate = (event) => {
      const candidate = (
        event as Event & { candidate?: RTCIceCandidate | null }
      ).candidate;
      if (candidate) {
        this.send({
          type: 'ice-candidate',
          payload: candidate.toJSON(),
        });
      }
    };

    this.peer.ontrack = (event) => {
      const trackEvent = event as unknown as {
        track?: MediaStreamTrack | null;
        streams?: MediaStream[];
      };
      const videoTrack = trackEvent.track;
      if (this.closed || videoTrack?.kind !== 'video') return;

      // Some callers send a streamless video track. Build a renderer stream
      // for it instead of silently dropping the track.
      const remoteStream =
        trackEvent.streams?.find((stream) =>
          stream.getVideoTracks().some((track) => track.id === videoTrack.id),
        ) ??
        trackEvent.streams?.[0] ??
        new WebRTCMediaStream([videoTrack]);
      this.remoteVideoStream = remoteStream;
      callbacks.onRemoteVideo(remoteStream);

      videoTrack.onended = () => {
        if (this.closed || this.remoteVideoStream !== remoteStream) return;
        const hasLiveVideo = remoteStream
          .getVideoTracks()
          .some((track) => track.readyState === 'live');
        if (!hasLiveVideo) {
          this.remoteVideoStream = null;
          callbacks.onRemoteVideo(null);
        }
      };
      videoTrack.onunmute = () => {
        if (!this.closed && this.remoteVideoStream === remoteStream) {
          callbacks.onRemoteVideo(remoteStream);
        }
      };
    };

    this.peer.onconnectionstatechange = () => {
      if (this.peer?.connectionState === 'connected') {
        callbacks.onConnected();
        this.send({ type: 'connected' });
      } else if (this.peer?.connectionState === 'failed') {
        callbacks.onError(
          'ارتباط صوتی برقرار نشد. اینترنت و دسترسی TURN را بررسی کنید.',
        );
      } else if (this.peer?.connectionState === 'disconnected') {
        callbacks.onStatus('ارتباط لحظه‌ای قطع شد؛ در حال بازیابی…');
        callbacks.onDisconnected();
      }
    };

    this.peer.oniceconnectionstatechange = () => {
      if (this.peer?.iceConnectionState === 'checking') {
        callbacks.onStatus('در حال برقراری ارتباط صوتی امن…');
      }
      if (this.peer?.iceConnectionState === 'failed') {
        callbacks.onError(
          'اتصال relay برقرار نشد. اطلاعات موقت TURN را بررسی کنید.',
        );
      }
    };

    const WebSocketWithOptions =
      WebSocket as unknown as NativeWebSocketConstructor;
    const url = `wss://petipy.com/api/voice/ws/${encodeURIComponent(session.callId)}`;
    this.socket =
      Platform.OS === 'web'
        ? new WebSocket(url, ['voice-v1', `auth.${session.token}`])
        : new WebSocketWithOptions(
            url,
            ['voice-v1', `auth.${session.token}`],
            { headers: { Origin: 'https://petipy.com' } },
          );

    this.socket.onopen = () => {
      callbacks.onStatus('در انتظار اتصال مشتری…');
    };
    this.socket.onerror = () => {
      callbacks.onError('اتصال امن تماس با Petipy برقرار نشد.');
    };
    this.socket.onclose = () => {
      if (!this.closed) callbacks.onStatus('ارتباط تماس قطع شد.');
    };
    this.socket.onmessage = (event) => {
      void this.handleSignal(event.data);
    };
  }

  private send(message: { type: string; payload?: unknown }): boolean {
    if (this.socket?.readyState !== WebSocket.OPEN) return false;
    this.socket.send(JSON.stringify(message));
    return true;
  }

  acknowledgePetCards(): boolean {
    return this.send(PET_CARD_SHARED_ACKNOWLEDGEMENT);
  }

  private async handleSignal(data: unknown) {
    const message = readSignal(data);
    if (!message || !this.peer) return;
    if (message.from === 'consultant') return;

    const petCardShare = parsePetCardShareMessage(message);
    if (petCardShare) {
      this.petCardShareSequence += 1;
      this.callbacks?.onPetCardsReceived(
        this.petCardShareSequence,
        petCardShare.payload.pets,
      );
      return;
    }

    if (message.type === 'joined') {
      this.callbacks?.onStatus('وارد اتاق تماس شدید؛ در انتظار مشتری…');
      return;
    }
    if (message.type === 'peer-ready') {
      this.callbacks?.onStatus('مشتری متصل شد؛ در حال برقراری صدا…');
      return;
    }
    if (message.type === 'offer' && message.payload) {
      try {
        await this.peer.setRemoteDescription(
          message.payload as Parameters<
            RTCPeerConnection['setRemoteDescription']
          >[0],
        );
        for (const candidate of this.pendingCandidates.splice(0)) {
          await this.peer.addIceCandidate(candidate);
        }
        const answer = await this.peer.createAnswer();
        await this.peer.setLocalDescription(answer);
        this.send({ type: 'answer', payload: this.peer.localDescription });
        this.callbacks?.onStatus('در حال اتصال به مشتری…');
      } catch {
        this.callbacks?.onError('پاسخ تماس دریافت شد اما اتصال صوتی شروع نشد.');
      }
      return;
    }
    if (message.type === 'ice-candidate' && message.payload) {
      try {
        const candidate = message.payload as RTCIceCandidate;
        if (this.peer.remoteDescription) {
          await this.peer.addIceCandidate(candidate);
        } else {
          this.pendingCandidates.push(candidate);
        }
      } catch {
        this.callbacks?.onError('بسته‌ی اتصال صوتی معتبر نیست.');
      }
      return;
    }
    if (message.type === 'connected') {
      // Signaling confirms the other participant's state, not local media.
      // The UI only marks the call connected after WebRTC reports it.
      if (this.peer.connectionState !== 'connected') {
        this.callbacks?.onStatus('مشتری به تماس پیوست؛ در حال برقراری صدا…');
      }
      return;
    }
    if (message.type === 'hangup') {
      this.callbacks?.onEnded();
    }
  }

  setMuted(muted: boolean) {
    const track = this.localStream?.getAudioTracks()[0];
    if (track) track.enabled = !muted;
    if (Platform.OS === 'android') InCallManager.setMicrophoneMute(muted);
  }

  async setAudioRoute(
    route: 'earpiece' | 'speaker',
    callId: string,
  ): Promise<boolean> {
    if (Platform.OS === 'ios') {
      if (this.audioBackend === 'callkit') {
        return setSystemCallAudioRoute(callId, route);
      }
      if (this.audioBackend !== 'incall-manager') return false;
      try {
        InCallManager.setSpeakerphoneOn(route === 'speaker');
        return true;
      } catch {
        return false;
      }
    }
    if (Platform.OS !== 'android') return false;

    const device = route === 'speaker' ? 'SPEAKER_PHONE' : 'EARPIECE';
    let inCallRouteAvailable = false;
    try {
      const routeStatus = await InCallManager.chooseAudioRoute(device);
      const availableDevices = JSON.parse(
        routeStatus?.availableAudioDeviceList ?? '[]',
      ) as unknown;
      inCallRouteAvailable =
        Array.isArray(availableDevices) && availableDevices.includes(device);
    } catch {
      // Telecom can still apply the route if InCallManager cannot.
    }

    const telecomRouteApplied = await setSystemCallAudioRoute(callId, route);
    return inCallRouteAvailable || telecomRouteApplied;
  }

  close(sendHangup = false) {
    this.closed = true;
    if (sendHangup) this.send({ type: 'hangup' });
    this.socket?.close();
    this.socket = null;
    this.peer?.close();
    this.peer = null;
    this.localStream?.getTracks().forEach((track) => track.stop());
    this.localStream = null;
    this.remoteVideoStream = null;
    this.callbacks?.onRemoteVideo(null);
    this.pendingCandidates = [];
    this.petCardShareSequence = 0;
    if (this.audioManagerStarted) {
      InCallManager.stop();
      this.audioManagerStarted = false;
    }
    this.audioBackend = 'none';
  }
}
