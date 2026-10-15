// Side-by-side comparison of design/screens (left) with the Playwright
// screenshots in test-results/screens (right), plus a rough pixel difference.
// Run `npm run test:e2e -- screens` first, then `npm run screens:compare`.

import { mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

const DESIGN = "design/screens";
const OURS = "test-results/screens";
const OUT = "test-results/compare";
const W = 780,
  H = 1688,
  GAP = 24;

async function raw(path: string) {
  return sharp(path).resize(W, H, { fit: "fill" }).removeAlpha().raw().toBuffer();
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  for (const file of readdirSync(DESIGN).filter((f) => f.endsWith(".png"))) {
    const design = join(DESIGN, file),
      ours = join(OURS, file);
    let a: Buffer, b: Buffer;
    try {
      [a, b] = await Promise.all([raw(design), raw(ours)]);
    } catch {
      console.log(`${file}: missing screenshot`);
      continue;
    }
    // Share of pixels whose channels differ by more than 48 (ignores anti-aliasing noise).
    let diff = 0;
    for (let i = 0; i < a.length; i += 3) {
      if (Math.max(Math.abs(a[i] - b[i]), Math.abs(a[i + 1] - b[i + 1]), Math.abs(a[i + 2] - b[i + 2])) > 48)
        diff++;
    }
    const pct = ((diff / (W * H)) * 100).toFixed(1);
    await sharp({ create: { width: W * 2 + GAP, height: H, channels: 3, background: "#CFCCC6" } })
      .composite([
        { input: await sharp(design).resize(W, H, { fit: "fill" }).toBuffer(), left: 0, top: 0 },
        { input: await sharp(ours).resize(W, H, { fit: "fill" }).toBuffer(), left: W + GAP, top: 0 },
      ])
      .png()
      .toFile(join(OUT, file));
    console.log(`${file}: ${pct}% of pixels differ`);
  }
}

main();
