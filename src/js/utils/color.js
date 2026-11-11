// Color helpers for readable text on user-chosen colors. No DOM access.

const HEX = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;

/** '#4a7cf6' / '4a7cf6' / '#fc0' → [r, g, b] (0–255), or null when it isn't a hex color. */
export function parseHexColor(value) {
  const match = HEX.exec(String(value ?? '').trim());
  if (!match) return null;
  let hex = match[1];
  if (hex.length === 3) hex = [...hex].map((c) => c + c).join('');
  return [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
}

/** WCAG relative luminance (0 = black, 1 = white) of an [r, g, b] color. */
export function relativeLuminance([r, g, b]) {
  const [R, G, B] = [r, g, b].map((channel) => {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

/** WCAG contrast ratio between two hex colors (1–21), or null if either can't be parsed. */
export function contrastRatio(hexA, hexB) {
  const a = parseHexColor(hexA);
  const b = parseHexColor(hexB);
  if (!a || !b) return null;
  const [light, dark] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

/**
 * Picks the text color with the higher contrast on `background`.
 * Unparseable backgrounds get `light` (the app's badges default to dark backgrounds).
 * @param {string} background hex color
 * @param {{ light?: string, dark?: string }} [options]
 * @returns {string}
 */
export function readableTextColor(background, { light = '#ffffff', dark = '#2a303b' } = {}) {
  const onLight = contrastRatio(background, light);
  const onDark = contrastRatio(background, dark);
  if (onLight === null || onDark === null) return light;
  return onDark > onLight ? dark : light;
}
