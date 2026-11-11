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
    text: '#402831',
    tint: '#A52B45',
    background: '#F7F0E8',
    foreground: '#402831',
    card: '#FFFBF6',
    cardForeground: '#402831',
    primary: '#A52B45',
    primaryForeground: '#FFF9F4',
    secondary: '#F1E2DF',
    secondaryForeground: '#762438',
    muted: '#EFE5DE',
    mutedForeground: '#866E70',
    accent: '#F4D8D4',
    accentForeground: '#7E2D3C',
    destructive: '#A9233F',
    destructiveForeground: '#FFF9F4',
    border: '#E7D5D0',
    input: '#DEC9C5',
    success: '#527A62',
    warning: '#A96C3D',
  },
  dark: {
    text: '#F7EDE8',
    tint: '#E78A9A',
    background: '#24191E',
    foreground: '#F7EDE8',
    card: '#302127',
    cardForeground: '#F7EDE8',
    primary: '#E78A9A',
    primaryForeground: '#321B22',
    secondary: '#472B34',
    secondaryForeground: '#F3C4CC',
    muted: '#3B2930',
    mutedForeground: '#C0A5A7',
    accent: '#57323B',
    accentForeground: '#F1C2C8',
    destructive: '#F08B9B',
    destructiveForeground: '#321B22',
    border: '#513740',
    input: '#5A3D46',
    success: '#9CC29F',
    warning: '#E3AD77',
  },
  radius: 22,
};

export default colors;
