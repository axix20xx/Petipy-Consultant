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
    text: '#39262A',
    tint: '#A52D45',
    background: '#F5EEE4',
    foreground: '#39262A',
    card: '#FFF9F0',
    cardForeground: '#39262A',
    primary: '#9E2741',
    primaryForeground: '#FFF8EF',
    secondary: '#F0DDD5',
    secondaryForeground: '#702337',
    muted: '#EDE3D8',
    mutedForeground: '#806D67',
    accent: '#E8C9BC',
    accentForeground: '#6E2A38',
    destructive: '#A72C43',
    destructiveForeground: '#FFF8EF',
    border: '#E4D4C7',
    input: '#DCC8BB',
    success: '#55745D',
    warning: '#A4673F',
  },
  dark: {
    text: '#F7EDE3',
    tint: '#E39AAA',
    background: '#241A1C',
    foreground: '#F7EDE3',
    card: '#332527',
    cardForeground: '#F7EDE3',
    primary: '#D86F83',
    primaryForeground: '#2F1A20',
    secondary: '#4A3034',
    secondaryForeground: '#F1C7C6',
    muted: '#3D2D2D',
    mutedForeground: '#C0A8A0',
    accent: '#5B3A3B',
    accentForeground: '#F2D1C9',
    destructive: '#E98B97',
    destructiveForeground: '#321B22',
    border: '#574043',
    input: '#60464A',
    success: '#9CC29F',
    warning: '#E3AD77',
  },
  radius: 22,
};

export default colors;
