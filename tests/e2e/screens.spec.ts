import { expect, test } from "@playwright/test";
import { dragCard, seedBest, shoot } from "./helpers";

// Screenshots of each screen at 390×844 @2x, named after design/screens.
// Compare with: npm run screens:compare

test.beforeEach(async ({ page }) => {
  await seedBest(page, 11);
});

test("01 home", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("home-best")).toHaveText("11");
  await shoot(page, "01-home");
});

test("02 play", async ({ page }) => {
  await page.goto("/?screen=play&song=3");
  await expect(page.getByRole("heading", { name: "Master of Puppets" })).toBeVisible();
  await shoot(page, "02-play");
});

test("03 swiping right", async ({ page }) => {
  await page.goto("/?screen=play&song=3");
  await expect(page.getByTestId("top-card")).toBeVisible();
  await page.addStyleTag({ content: ".progress-fill { animation: none !important; }" });
  await dragCard(page, 130, { hold: true });
  await expect(page.getByRole("button", { name: "Higher" })).toHaveAttribute("data-armed", "true");
  await expect(page.getByRole("button", { name: "Lower" })).toHaveAttribute("data-dim", "true");
  await shoot(page, "03-swiping-right");
  await page.mouse.up();
});

test("04 reveal", async ({ page }) => {
  await page.goto("/?screen=reveal");
  await expect(page.getByTestId("verdict")).toContainText("Correct. Higher it is.");
  await shoot(page, "04-reveal");
});

test("05 game over", async ({ page }) => {
  await page.goto("/?screen=over");
  await expect(page.getByText("Game over.", { exact: true })).toBeVisible();
  await shoot(page, "05-game-over");
});

test("06 play, green album accent", async ({ page }) => {
  await page.goto("/?screen=play&song=0");
  const higher = page.getByRole("button", { name: "Higher" });
  await expect(higher).toHaveCSS("background-color", "rgb(207, 219, 148)");
  await shoot(page, "06-play-album-colour-green");
});

test("07 play, fallback accent", async ({ page }) => {
  await page.goto("/?screen=play&song=2");
  const higher = page.getByRole("button", { name: "Higher" });
  await expect(higher).toHaveCSS("background-color", "rgb(228, 87, 46)");
  await shoot(page, "07-play-album-colour-fallback");
});
