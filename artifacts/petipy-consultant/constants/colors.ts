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
    scrim: 'rgba(43, 33, 61, 0.46)',
  },
  dark: {
    text: '#F2ECFB',
    tint: '#C3A7FF',
    background: '#1B1722',
    foreground: '#F2ECFB',
    card: '#272130',
    cardForeground: '#F2ECFB',
    primary: '#B99AF6',
    primaryForeground: '#261A3C',
    secondary: '#352B43',
    secondaryForeground: '#D9C6FF',
    muted: '#302938',
    mutedForeground: '#B9B0C4',
    accent: '#493342',
    accentForeground: '#F1C5D8',
    destructive: '#F18AA0',
    destructiveForeground: '#3B1925',
    border: '#443A50',
    input: '#574B64',
    success: '#88CBA9',
    warning: '#E5BC78',
    scrim: 'rgba(13, 10, 18, 0.7)',
  },
  radius: 18,
};

export default colors;
