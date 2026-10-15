import { expect, test } from "@playwright/test";

test("tokens page renders swatches and self-hosted fonts", async ({ page }) => {
  await page.goto("/tokens");
  await expect(page.locator("[data-token]")).toHaveCount(9);

  const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(bg).toBe("rgb(227, 225, 220)");

  await page.evaluate(() => document.fonts.ready);
  const loaded = await page.evaluate(() =>
    [...document.fonts].filter((f) => f.status === "loaded").map((f) => `${f.family} ${f.weight}`),
  );
  expect(loaded.some((f) => /anton/i.test(f))).toBe(true);
  for (const w of ["400", "500", "600", "700"]) {
    expect(
      loaded.some((f) => /schibsted/i.test(f) && f.endsWith(w)),
      `Schibsted ${w}`,
    ).toBe(true);
  }

  await page.screenshot({ path: "test-results/screens/00-tokens.png", fullPage: true });
});
