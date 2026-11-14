import colors from '@/constants/colors';
import { useColorScheme } from 'react-native';

/**
 * Returns the design tokens for the current color scheme.
 *
 * The returned object contains all color tokens for the active palette
 * plus scheme-independent values like `radius`.
 *
 * Follows the platform appearance setting, with light as the fallback.
 */
export function useColors() {
  const scheme = useColorScheme();
  return { ...(scheme === 'dark' ? colors.dark : colors.light), radius: colors.radius };
}
