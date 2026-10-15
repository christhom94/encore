import sharp from "sharp";
import { contrast, hslToRgb, INK, rgbToHex, rgbToHsl } from "./color";

// Album accent colour, computed server-side at ingest. A port of extractAccent()
// in design/prototype/index.html (see CLAUDE.md "Album accent colour").

const SIZE = 64;

/** The prototype's algorithm on raw RGB(A) pixels of a 64×64 image. */
export function accentFromPixels(px: Uint8Array | Buffer, channels: number): string | null {
  const buckets = new Map<number, { w: number; r: number; g: number; b: number; n: number }>();
  for (let i = 0; i < px.length; i += channels) {
    const r = px[i],
      g = px[i + 1],
      b = px[i + 2];
    const [h, s, l] = rgbToHsl([r, g, b]);
    if (s < 0.35 || l < 0.15 || l > 0.85) continue; // ignore greys, near black, near white
    const k = Math.floor(h * 24) % 24,
      w = s * (1 - Math.abs(l - 0.5) * 2); // favour vivid mid tones
    let bucket = buckets.get(k);
    if (!bucket) buckets.set(k, (bucket = { w: 0, r: 0, g: 0, b: 0, n: 0 }));
    bucket.w += w;
    bucket.r += r * w;
    bucket.g += g * w;
    bucket.b += b * w;
    bucket.n++;
  }
  // Heaviest bin; ties keep the first in insertion order, as the prototype's stable sort does.
  let best: { w: number; r: number; g: number; b: number; n: number } | undefined;
  for (const bucket of buckets.values()) if (!best || bucket.w > best.w) best = bucket;
  if (!best || best.n / (SIZE * SIZE) < 0.002) return null; // too little colour: use the default

  const [h, s0, l0] = rgbToHsl([best.r / best.w, best.g / best.w, best.b / best.w]);
  const s = Math.max(s0, 0.5);
  let l = Math.min(Math.max(l0, 0.45), 0.72); // keep it bright enough to read ink on it
  let hex = rgbToHex(hslToRgb([h, s, l]));
  while (contrast(hex, INK) < 4.5 && l < 0.8) {
    l += 0.01;
    hex = rgbToHex(hslToRgb([h, s, l]));
  }
  return hex;
}

/** Accent colour for a cover image (file path or bytes), or null for the default red. */
export async function extractAccent(image: string | Buffer): Promise<string | null> {
  const { data, info } = await sharp(image)
    // mks2021 is the kernel that reproduces the prototype's browser-canvas results on the sample covers.
    .resize(SIZE, SIZE, { fit: "fill", kernel: "mks2021" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return accentFromPixels(data, info.channels);
}
