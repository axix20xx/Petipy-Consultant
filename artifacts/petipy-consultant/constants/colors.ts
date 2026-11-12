/**
 * Semantic design tokens for the mobile app.
 *
 * These tokens mirror the naming conventions used in web artifacts (index.css)
 * so that multi-artifact projects share a cohesive visual identity.
 *
 * Replace the placeholder values below with values that match the project's
 * brand. If a sibling web artifact exists, read its index.css and convert the
 * HSL values to hex so both artifacts use the same palette.
 *
 * To add dark mode, add a `dark` key with the same token names.
 * The useColors() hook will automatically pick it up.
 */

const colors = {
  light: {
    text: '#302747',
    tint: '#6946C6',
    background: '#F8F7FC',
    foreground: '#302747',
    card: '#FFFFFF',
    cardForeground: '#302747',
    primary: '#6946C6',
    primaryForeground: '#FFFFFF',
    secondary: '#EEE9FB',
    secondaryForeground: '#50369B',
    muted: '#F0EEF6',
    mutedForeground: '#777287',
    accent: '#E6DDF8',
    accentForeground: '#50369B',
    destructive: '#C84B62',
    destructiveForeground: '#FFFFFF',
    border: '#E6E2EF',
    input: '#DAD5E7',
    success: '#39856A',
    warning: '#A97832',
  },
  dark: {
    text: '#302747',
    tint: '#6946C6',
    background: '#F8F7FC',
    foreground: '#302747',
    card: '#FFFFFF',
    cardForeground: '#302747',
    primary: '#6946C6',
    primaryForeground: '#FFFFFF',
    secondary: '#EEE9FB',
    secondaryForeground: '#50369B',
    muted: '#F0EEF6',
    mutedForeground: '#777287',
    accent: '#E6DDF8',
    accentForeground: '#50369B',
    destructive: '#C84B62',
    destructiveForeground: '#FFFFFF',
    border: '#E6E2EF',
    input: '#DAD5E7',
    success: '#39856A',
    warning: '#A97832',
  },
  radius: 18,
};

export default colors;
