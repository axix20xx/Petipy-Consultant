import { useColors } from '@/hooks/useColors';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

type PetipyPetMarkProps = {
  compact?: boolean;
  testID?: string;
};

export function PetipyPetMark({ compact = false, testID }: PetipyPetMarkProps) {
  const colors = useColors();
  return (
    <View
      accessible={false}
      testID={testID}
      style={[
        styles.stage,
        compact ? styles.compactStage : styles.heroStage,
        { backgroundColor: colors.secondary },
      ]}
    >
      <View style={[styles.orbit, { borderColor: colors.accent }]} />
      <View style={[styles.orbitSmall, { borderColor: colors.border }]} />
      <View style={[styles.pawStamp, { backgroundColor: colors.card }]}>
        <Ionicons name="paw" size={compact ? 12 : 15} color={colors.primary} />
      </View>
      <View style={[styles.ear, compact && styles.compactEar, styles.earLeft, { backgroundColor: colors.primary }]} />
      <View style={[styles.ear, compact && styles.compactEar, styles.earRight, { backgroundColor: colors.primary }]} />
      <View style={[styles.face, compact && styles.compactFace, { backgroundColor: colors.card }]}>
        <View style={[styles.eyeLine, compact && styles.compactEyeLine]}>
          <View style={[styles.eye, compact && styles.compactEye, { backgroundColor: colors.foreground }]} />
          <View style={[styles.eye, compact && styles.compactEye, { backgroundColor: colors.foreground }]} />
        </View>
        <View style={[styles.nose, compact && styles.compactNose, { backgroundColor: colors.accentForeground }]} />
        <View style={[styles.cheekLine, compact && styles.compactCheekLine]}>
          <View style={[styles.cheek, compact && styles.compactCheek, { backgroundColor: colors.accent }]} />
          <View style={[styles.cheek, compact && styles.compactCheek, { backgroundColor: colors.accent }]} />
        </View>
      </View>
      <View style={[styles.callBadge, { backgroundColor: colors.primary }]}>
        <Ionicons name="call" size={compact ? 11 : 13} color={colors.primaryForeground} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  heroStage: { width: '100%', height: 182 },
  compactStage: { width: 84, height: 84, borderRadius: 27 },
  orbit: {
    position: 'absolute',
    width: 142,
    height: 142,
    borderWidth: 1,
    borderRadius: 71,
  },
  orbitSmall: {
    position: 'absolute',
    width: 105,
    height: 105,
    borderWidth: 1,
    borderRadius: 53,
  },
  pawStamp: {
    position: 'absolute',
    top: 21,
    left: '24%',
    width: 31,
    height: 31,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-12deg' }],
  },
  ear: {
    position: 'absolute',
    top: '29%',
    width: 31,
    height: 39,
    borderRadius: 16,
  },
  earLeft: { left: '32%', transform: [{ rotate: '-24deg' }] },
  earRight: { right: '32%', transform: [{ rotate: '24deg' }] },
  face: {
    width: 96,
    height: 82,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
  },
  compactEar: { width: 18, height: 24, top: '27%', borderRadius: 10 },
  compactFace: { width: 54, height: 48, borderRadius: 22, marginTop: 7 },
  eyeLine: {
    width: 43,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 9,
  },
  compactEyeLine: { width: 27, marginTop: 5 },
  eye: { width: 5, height: 7, borderRadius: 4 },
  compactEye: { width: 3, height: 4, marginTop: 4 },
  nose: { width: 8, height: 6, borderRadius: 5, marginTop: 7 },
  compactNose: { width: 5, height: 4, marginTop: 4 },
  cheekLine: {
    position: 'absolute',
    width: 72,
    flexDirection: 'row',
    justifyContent: 'space-between',
    top: 49,
  },
  compactCheekLine: { width: 39, top: 29 },
  cheek: { width: 12, height: 6, borderRadius: 5, opacity: 0.8 },
  compactCheek: { width: 7, height: 4 },
  callBadge: {
    position: 'absolute',
    right: '25%',
    bottom: 20,
    width: 33,
    height: 33,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '8deg' }],
  },
});
