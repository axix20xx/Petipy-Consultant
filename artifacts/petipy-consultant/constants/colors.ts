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
    text: '#33264D',
    tint: '#7652D6',
    background: '#F7F4FC',
    foreground: '#33264D',
    card: '#FFFEFF',
    cardForeground: '#33264D',
    primary: '#7652D6',
    primaryForeground: '#FFFFFF',
    secondary: '#EEE8FB',
    secondaryForeground: '#543B9B',
    muted: '#F0ECF6',
    mutedForeground: '#81788F',
    accent: '#F7E9F1',
    accentForeground: '#744B68',
    destructive: '#C4516A',
    destructiveForeground: '#FFFFFF',
    border: '#E8E1F0',
    input: '#DCD3E8',
    success: '#45866E',
    warning: '#A87536',
  },
  dark: {
    text: '#33264D',
    tint: '#7652D6',
    background: '#F7F4FC',
    foreground: '#33264D',
    card: '#FFFEFF',
    cardForeground: '#33264D',
    primary: '#7652D6',
    primaryForeground: '#FFFFFF',
    secondary: '#EEE8FB',
    secondaryForeground: '#543B9B',
    muted: '#F0ECF6',
    mutedForeground: '#81788F',
    accent: '#F7E9F1',
    accentForeground: '#744B68',
    destructive: '#C4516A',
    destructiveForeground: '#FFFFFF',
    border: '#E8E1F0',
    input: '#DCD3E8',
    success: '#45866E',
    warning: '#A87536',
  },
  radius: 18,
};

export default colors;
