import { RTCView } from 'react-native-webrtc';
import type { RemoteVideoProps } from './RemoteVideo';
import { StyleSheet } from 'react-native';

export default function RemoteVideo({ stream, label }: RemoteVideoProps) {
  return (
    <RTCView
      accessibilityLabel={label}
      accessible
      mirror={false}
      objectFit="cover"
      streamURL={stream.toURL()}
      style={StyleSheet.absoluteFill}
      zOrder={0}
    />
  );
}
