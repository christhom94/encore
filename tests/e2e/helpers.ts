import { expect, type Page } from "@playwright/test";
import { SAMPLE_ARTIST } from "../../src/data/sample-deck";

export const SCREENS = "test-results/screens";

/** Seed the stored best streak (the design screenshots show 11). */
export async function seedBest(page: Page, best: number) {
  await page.addInitScript(
    ([key, value]) => {
      try {
        localStorage.setItem(key, value);
      } catch {}
    },
    [`encore.best.${SAMPLE_ARTIST.id}`, String(best)] as const,
  );
}

/** A silent 8 kHz mono WAV of the given length. */
export function silentWav(seconds: number): Buffer {
  const rate = 8000,
    n = rate * seconds;
  const b = Buffer.alloc(44 + n, 128); // 8-bit unsigned silence is 128
  b.write("RIFF", 0);
  b.writeUInt32LE(36 + n, 4);
  b.write("WAVEfmt ", 8);
  b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20); // PCM
  b.writeUInt16LE(1, 22); // mono
  b.writeUInt32LE(rate, 24);
  b.writeUInt32LE(rate, 28);
  b.writeUInt16LE(1, 32);
  b.writeUInt16LE(8, 34);
  b.write("data", 36);
  b.writeUInt32LE(n, 40);
  return b;
}

/**
 * Stub /api/preview so tests never call Deezer. "silent" serves a 30 s silent
 * WAV; "hang" never delivers the audio, freezing the bar at 0:30 like the design;
 * "none" answers 404 (no preview for the song).
 */
export async function mockPreviews(page: Page, mode: "silent" | "hang" | "none" = "silent") {
  const wav = silentWav(30);
  await page.route("**/api/preview/*", (route) =>
    mode === "none"
      ? route.fulfill({ status: 404, json: { error: "No preview for this track" } })
      : route.fulfill({ json: { url: `${new URL(route.request().url()).origin}/test-preview.wav` } }),
  );
  await page.route("**/test-preview.wav", (route) =>
    mode === "hang" ? undefined : route.fulfill({ body: wav, contentType: "audio/wav" }),
  );
  // Remember the audio element (it is not in the DOM) so tests can inspect it.
  await page.addInitScript(() => {
    const play = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function (this: HTMLMediaElement) {
      (window as unknown as { __audio: HTMLMediaElement }).__audio = this;
      return play.call(this);
    };
  });
}

/** Wait for fonts and images. */
export async function settle(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => [...document.images].every((img) => img.complete && img.naturalWidth > 0));
  await page.waitForTimeout(150);
}

export async function shoot(page: Page, name: string) {
  await settle(page);
  await page.screenshot({ path: `${SCREENS}/${name}.png` });
}

/** Drag the top card horizontally by dx pixels. Leaves the pointer down when hold is true. */
export async function dragCard(page: Page, dx: number, { hold = false } = {}) {
  const box = await page.getByTestId("top-card").boundingBox();
  expect(box).not.toBeNull();
  const x = box!.x + box!.width / 2,
    y = box!.y + box!.height * 0.7;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + dx, y, { steps: 12 });
  if (!hold) await page.mouse.up();
}
