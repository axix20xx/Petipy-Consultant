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
    text: '#241843',
    tint: '#6b3fe1',
    background: '#fdf9f2',
    foreground: '#241843',
    card: '#ffffff',
    cardForeground: '#241843',
    primary: '#6b3fe1',
    primaryForeground: '#ffffff',
    secondary: '#eee8f9',
    secondaryForeground: '#4b347d',
    muted: '#f1ecf6',
    mutedForeground: '#7b7385',
    accent: '#fff0e6',
    accentForeground: '#a74920',
    destructive: '#c64c48',
    destructiveForeground: '#ffffff',
    border: '#2d2143',
    input: '#e3d9ed',
    success: '#268364',
    warning: '#e87732',
  },
  dark: {
    text: '#f6f1fa',
    tint: '#b598ff',
    background: '#171222',
    foreground: '#f6f1fa',
    card: '#211b2e',
    cardForeground: '#f6f1fa',
    primary: '#b598ff',
    primaryForeground: '#211633',
    secondary: '#302641',
    secondaryForeground: '#e9ddff',
    muted: '#2d2638',
    mutedForeground: '#b0a6bb',
    accent: '#482b20',
    accentForeground: '#ffb48d',
    destructive: '#f27670',
    destructiveForeground: '#301413',
    border: '#392f49',
    input: '#392f49',
    success: '#6dc09e',
    warning: '#f49a65',
  },
  radius: 18,
};

export default colors;
