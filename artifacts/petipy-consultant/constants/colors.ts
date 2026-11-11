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
    text: '#263a39',
    tint: '#26756d',
    background: '#f4f5ef',
    foreground: '#263a39',
    card: '#fffefa',
    cardForeground: '#263a39',
    primary: '#26756d',
    primaryForeground: '#fffefa',
    secondary: '#e2eeea',
    secondaryForeground: '#285e58',
    muted: '#e9eee9',
    mutedForeground: '#687b75',
    accent: '#f6e7d8',
    accentForeground: '#94603b',
    destructive: '#b85850',
    destructiveForeground: '#fffefa',
    border: '#dce5dd',
    input: '#d6e1da',
    success: '#39816d',
    warning: '#c78343',
  },
  dark: {
    text: '#edf3ed',
    tint: '#83c5b7',
    background: '#182321',
    foreground: '#edf3ed',
    card: '#222f2b',
    cardForeground: '#edf3ed',
    primary: '#83c5b7',
    primaryForeground: '#17312b',
    secondary: '#2a403a',
    secondaryForeground: '#c8e4da',
    muted: '#293631',
    mutedForeground: '#a4b5ac',
    accent: '#45392d',
    accentForeground: '#f0cba4',
    destructive: '#e18478',
    destructiveForeground: '#321b19',
    border: '#34443d',
    input: '#3b4b43',
    success: '#83c5a5',
    warning: '#e0ae73',
  },
  radius: 20,
};

export default colors;
