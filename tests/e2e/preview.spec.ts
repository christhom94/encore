import { expect, test, type Page } from "@playwright/test";
import { mockPreviews } from "./helpers";

const progress = (page: Page) =>
  page.getByTestId("preview-progress").evaluate((el) => parseFloat((el as HTMLElement).style.width) || 0);
const audioPaused = (page: Page) =>
  page.evaluate(() => (window as unknown as { __audio?: HTMLMediaElement }).__audio?.paused ?? true);

test("the preview plays when a card appears, follows the audio and pauses on swipe", async ({ page }) => {
  await mockPreviews(page, "silent");
  await page.goto("/");
  await page.getByRole("button", { name: /Metallica/ }).click();

  const pause = page.getByRole("button", { name: "Pause preview" });
  await expect(pause).toBeVisible();
  await expect.poll(() => progress(page), { timeout: 5000 }).toBeGreaterThan(2);
  expect(await audioPaused(page)).toBe(false);

  // Pause and resume from the button.
  await pause.click();
  await expect(page.getByRole("button", { name: "Play preview" })).toBeVisible();
  const held = await progress(page);
  await page.waitForTimeout(600);
  expect(await progress(page)).toBe(held);
  await page.getByRole("button", { name: "Play preview" }).click();
  await expect(page.getByRole("button", { name: "Pause preview" })).toBeVisible();

  // Swiping stops the audio.
  await page.getByRole("button", { name: "Higher" }).click();
  await expect(page.getByTestId("verdict")).toBeVisible();
  expect(await audioPaused(page)).toBe(true);

  // The next card starts its own preview from the beginning.
  await page.getByRole("button", { name: /Next song|See your run/ }).click();
  if (await page.getByTestId("top-card").isVisible()) {
    await expect(page.getByRole("button", { name: "Pause preview" })).toBeVisible();
  }
});

test("a song without a preview keeps the control disabled", async ({ page }) => {
  await mockPreviews(page, "none");
  await page.goto("/");
  await page.getByRole("button", { name: /Metallica/ }).click();
  await expect(page.getByRole("button", { name: "No preview for this song" })).toBeDisabled();
  await expect(page.getByText("No preview", { exact: true })).toBeVisible();
});

test("the footer credits Deezer next to the preview", async ({ page }) => {
  await mockPreviews(page, "silent");
  await page.goto("/?screen=play&song=0");
  await expect(page.getByRole("link", { name: "Deezer" })).toHaveAttribute("href", "https://www.deezer.com");
});

test("a guess plays a result sound", async ({ page }) => {
  await mockPreviews(page, "silent");
  // Count synthesised notes: two bright notes plus sparkle when right, two low ones when wrong.
  await page.addInitScript(() => {
    const Real = window.OscillatorNode;
    const w = window as unknown as { __notes: number[] };
    w.__notes = [];
    window.OscillatorNode = class extends Real {
      constructor(ctx: BaseAudioContext, opts?: OscillatorOptions) {
        super(ctx, opts);
        w.__notes.push(opts?.frequency ?? 0);
      }
    };
  });
  await page.goto("/");
  await page.getByRole("button", { name: /Metallica/ }).click();
  await expect(page.getByRole("button", { name: "Pause preview" })).toBeVisible();

  // The first sample card ("One", 1,646 vs 1,400) is higher.
  await page.getByRole("button", { name: "Higher" }).click();
  await expect(page.getByTestId("verdict")).toContainText("Correct.");
  const notes = await page.evaluate(() => (window as unknown as { __notes: number[] }).__notes);
  expect(notes.slice(0, 2).map(Math.round)).toEqual([659, 988]);
});
