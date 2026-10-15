// Colour helpers ported from design/prototype/index.html. Shared by the album
// accent theming (client) and accent extraction at ingest (server, Stage 3).

export type RGB = [number, number, number];
export type HSL = [number, number, number];

export const DEFAULT_ACCENT = "#E4572E";
export const INK = "#1C1C1F";
export const PAPER = "#F8F6F2";
export const TILE = "#ECE9E3";

export const hexToRgb = (h: string): RGB => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)) as RGB;

export const rgbToHex = (c: RGB): string =>
  "#" +
  c
    .map((v) => Math.round(v).toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();

export function luminance(hex: string): number {
  return hexToRgb(hex)
    .map((v) => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    })
    .reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0);
}

export function contrast(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

export function rgbToHsl([r, g, b]: RGB): HSL {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b),
    l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min,
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h / 6, s, l];
}

export function hslToRgb([h, s, l]: HSL): RGB {
  if (!s) return [l * 255, l * 255, l * 255];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s,
    p = 2 * l - q;
  const f = (t: number) => {
    t = (t + 1) % 1;
    return t < 1 / 6 ? p + (q - p) * 6 * t : t < 0.5 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p;
  };
  return [f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255];
}

export interface AccentTheme {
  "--higher": string;
  "--on-higher": string;
  "--accent-text": string;
}

/**
 * Theme derived from one accent: the text colour on it (ink or paper, whichever
 * contrasts more) and a darker shade for small text on light tiles (>= 4.5:1).
 */
export function themeFor(accent: string | null | undefined): AccentTheme {
  const hex = accent || DEFAULT_ACCENT;
  const on = contrast(hex, INK) >= contrast(hex, PAPER) ? INK : PAPER;
  const [h, s, l0] = rgbToHsl(hexToRgb(hex));
  let l = l0,
    text = hex;
  while (contrast(text, TILE) < 4.5 && l > 0.05) {
    l -= 0.02;
    text = rgbToHex(hslToRgb([h, s, l]));
  }
  return { "--higher": hex, "--on-higher": on, "--accent-text": text };
}
