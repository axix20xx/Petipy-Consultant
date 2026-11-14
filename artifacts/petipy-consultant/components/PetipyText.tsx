import {
  StyleSheet,
  Text as NativeText,
  type TextProps,
  type TextStyle,
} from 'react-native';

type VazirmatnWeight = '400' | '500' | '600' | '700';

function resolveWeight(weight?: TextStyle['fontWeight']): VazirmatnWeight {
  if (weight === '500' || weight === 'medium') return '500';
  if (weight === '600' || weight === 'semibold') return '600';
  if (
    weight === 'bold' ||
    weight === '700' ||
    weight === '800' ||
    weight === '900'
  ) {
    return '700';
  }
  return '400';
}

export function PetipyText({ style, ...props }: TextProps) {
  const flattened = StyleSheet.flatten(style);
  const weight = resolveWeight(flattened?.fontWeight);
  const fontFamily =
    flattened?.fontFamily ??
    `Vazirmatn_${weight === '400' ? '400Regular' : weight === '500' ? '500Medium' : weight === '600' ? '600SemiBold' : '700Bold'}`;

  return (
    <NativeText
      {...props}
      style={[
        style,
        {
          fontFamily,
          ...(flattened?.fontFamily ? {} : { fontWeight: weight }),
        },
      ]}
    />
  );
}
