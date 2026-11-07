import { Ionicons } from '@expo/vector-icons';
import type { MediaStream } from 'react-native-webrtc';
import { StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/hooks/useColors';

export type RemoteVideoProps = {
  stream: MediaStream;
  label: string;
};

export default function RemoteVideo({ label }: RemoteVideoProps) {
  const colors = useColors();
  return (
    <View
      style={[styles.unavailable, { backgroundColor: colors.card }]}
      accessibilityLabel={label}
    >
      <Ionicons
        name="videocam-off-outline"
        size={28}
        color={colors.mutedForeground}
      />
      <Text style={[styles.label, { color: colors.mutedForeground }]}>
        نمایش ویدیو در نسخه‌ی وب پشتیبانی نمی‌شود
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  unavailable: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 16,
  },
  label: {
    fontSize: 12,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
});
