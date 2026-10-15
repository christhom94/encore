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

/** Wait for fonts and images, and freeze the preview progress bar at 0:00 like the design. */
export async function settle(page: Page) {
  await page.addStyleTag({ content: ".progress-fill { animation: none !important; }" });
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
