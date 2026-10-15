import { expect, test, type Page } from "@playwright/test";
import { SAMPLE_DECK } from "../../src/data/sample-deck";
import { truthFor } from "../../src/game/reducer";
import { dragCard } from "./helpers";

const truths = SAMPLE_DECK.map(truthFor);
type Input = "button" | "key" | "drag";

async function guess(page: Page, dir: "higher" | "lower", input: Input) {
  if (input === "button")
    await page.getByRole("button", { name: dir === "higher" ? "Higher" : "Lower" }).click();
  else if (input === "key") await page.keyboard.press(dir === "higher" ? "ArrowRight" : "ArrowLeft");
  else await dragCard(page, dir === "higher" ? 160 : -160);
  await expect(page.getByTestId("verdict")).toBeVisible();
}

test("a full run clears the setlist using drag, buttons and keyboard", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Metallica/ }).click();

  const inputs: Input[] = ["drag", "button", "key"];
  for (let i = 0; i < SAMPLE_DECK.length; i++) {
    const card = SAMPLE_DECK[i];
    await expect(page.getByRole("heading", { name: card.title })).toBeVisible();
    await guess(page, truths[i], inputs[i % 3]);
    await expect(page.getByTestId("verdict")).toContainText("Correct.");
    await expect(page.getByTestId("streak")).toContainText(String(i + 1));
    // Enter on the focused CTA moves on.
    await page.keyboard.press("Enter");
  }

  await expect(page.getByText("Setlist cleared.", { exact: true })).toBeVisible();
  await expect(page.getByTestId("final-streak")).toHaveText("10");
  await expect(page.getByText("Headliner")).toBeVisible();
});

test("a wrong guess ends the run", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Metallica/ }).click();

  await guess(page, truths[0], "button");
  await page.getByRole("button", { name: "Next song" }).click();

  const wrong = truths[1] === "higher" ? "lower" : "higher";
  await guess(page, wrong, "key");
  await expect(page.getByTestId("verdict")).toContainText(`Nope. It was ${truths[1]}.`);
  await expect(page.getByTestId("streak")).toHaveAttribute("data-hot", "false");
  await page.getByRole("button", { name: "See your run" }).click();

  await expect(page.getByText("Game over.", { exact: true })).toBeVisible();
  await expect(page.getByTestId("final-streak")).toHaveText("1");
  await expect(page.getByText("The one that got you")).toBeVisible();
  await expect(page.getByText(SAMPLE_DECK[1].title)).toBeVisible();

  // Play again starts a fresh run at song 01.
  await page.getByRole("button", { name: "Play Metallica again" }).click();
  await expect(page.getByText("Song 01")).toBeVisible();
});

test("a short drag springs back without guessing", async ({ page }) => {
  await page.goto("/?screen=play&song=0");
  await dragCard(page, 60);
  await expect(page.getByRole("heading", { name: SAMPLE_DECK[0].title })).toBeVisible();
  await expect(page.getByTestId("verdict")).toHaveCount(0);
});

test("reduced motion still plays through", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/?screen=play&song=0");
  await expect(page.getByTestId("top-card")).toBeVisible();
  await page.keyboard.press(truths[0] === "higher" ? "ArrowRight" : "ArrowLeft");
  await expect(page.getByTestId("verdict")).toContainText("Correct.");
});

test("best streak is saved per artist", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("home-best")).toHaveText("0");
  await page.getByRole("button", { name: /Metallica/ }).click();
  await guess(page, truths[0], "button");
  await page.getByRole("button", { name: "Back to home" }).click();
  await expect(page.getByTestId("home-best")).toHaveText("1");
  await page.reload();
  await expect(page.getByTestId("home-best")).toHaveText("1");
});
