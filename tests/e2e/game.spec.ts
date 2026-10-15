import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { SAMPLE_DECK } from "../../src/data/sample-deck";
import { truthFor } from "../../src/game/reducer";
import type { Card, Direction } from "../../src/game/types";
import { dragCard, mockPreviews } from "./helpers";
import { E2E } from "./seed";

// Full runs on the seeded database (real Metallica counts, MIN_PLAYS=1000:
// an 11-card deck). The same ?seed= gives the page and the test the same deck.

const SEED = 42;
const playUrl = `/play/${E2E.metallica}?seed=${SEED}`;
type Input = "button" | "key" | "drag";

async function seededDeck(request: APIRequestContext): Promise<Card[]> {
  const res = await request.get(`/api/game/${E2E.metallica}/deck?seed=${SEED}`);
  expect(res.ok()).toBe(true);
  return (await res.json()).deck;
}

async function guess(page: Page, dir: Direction, input: Input) {
  if (input === "button")
    await page.getByRole("button", { name: dir === "higher" ? "Higher" : "Lower" }).click();
  else if (input === "key") await page.keyboard.press(dir === "higher" ? "ArrowRight" : "ArrowLeft");
  else await dragCard(page, dir === "higher" ? 160 : -160);
  await expect(page.getByTestId("verdict")).toBeVisible();
}

const flip = (d: Direction): Direction => (d === "higher" ? "lower" : "higher");

test.beforeEach(async ({ page }) => {
  await mockPreviews(page, "silent");
});

test("a full run on real data clears the setlist using drag, buttons and keyboard", async ({
  page,
  request,
}) => {
  const deck = await seededDeck(request);
  expect(deck.length).toBeGreaterThanOrEqual(10);
  await page.goto(playUrl);

  const inputs: Input[] = ["drag", "button", "key"];
  for (const [i, card] of deck.entries()) {
    await expect(page.getByRole("heading", { name: card.title })).toBeVisible();
    await expect(page.getByTestId("line")).toHaveText(card.line.toLocaleString("en-GB"));
    await guess(page, truthFor(card), inputs[i % 3]);
    const verdict = page.getByTestId("verdict");
    await expect(verdict).toContainText("Correct.");
    // The reveal shows the real count from setlist.fm.
    await expect(verdict).toContainText(card.count.toLocaleString("en-GB"));
    await expect(page.getByText(`#${card.rank}`, { exact: true })).toBeVisible();
    await expect(page.getByTestId("streak")).toContainText(String(i + 1));
    await page.keyboard.press("Enter"); // Enter on the focused button moves on
  }

  await expect(page.getByText("Setlist cleared.", { exact: true })).toBeVisible();
  await expect(page.getByTestId("final-streak")).toHaveText(String(deck.length));
});

test("a wrong guess ends the run, and Play again deals a fresh deck", async ({ page, request }) => {
  const deck = await seededDeck(request);
  await page.goto(playUrl);

  await guess(page, truthFor(deck[0]), "button");
  await page.getByRole("button", { name: "Next song" }).click();
  await guess(page, flip(truthFor(deck[1])), "key");
  await expect(page.getByTestId("verdict")).toContainText(`Nope. It was ${truthFor(deck[1])}.`);
  await expect(page.getByTestId("streak")).toHaveAttribute("data-hot", "false");
  await page.getByRole("button", { name: "See your run" }).click();

  await expect(page.getByText("Game over.", { exact: true })).toBeVisible();
  await expect(page.getByTestId("final-streak")).toHaveText("1");
  await expect(page.getByText("The one that got you")).toBeVisible();

  await page.getByRole("button", { name: "Play Metallica again" }).click();
  await expect(page.getByText("Song 01")).toBeVisible();
  await expect(page.getByTestId("streak")).toContainText("0");
});

test("the played-at percentage uses the artist's real setlist total", async ({ page, request }) => {
  const deck = await seededDeck(request);
  await page.goto(playUrl);
  await guess(page, truthFor(deck[0]), "button");
  await expect(page.getByText("of 2,198 shows")).toBeVisible();
  const pct = Math.min(100, Math.round((deck[0].count / 2198) * 100));
  await expect(page.getByText(`${pct}%`, { exact: true })).toBeVisible();
});

test("a short drag springs back without guessing", async ({ page }) => {
  await page.goto("/play/sample?screen=play&song=0");
  await dragCard(page, 60);
  await expect(page.getByRole("heading", { name: SAMPLE_DECK[0].title })).toBeVisible();
  await expect(page.getByTestId("verdict")).toHaveCount(0);
});

test("reduced motion still plays through", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/play/sample?screen=play&song=0");
  await expect(page.getByTestId("top-card")).toBeVisible();
  await page.keyboard.press(truthFor(SAMPLE_DECK[0]) === "higher" ? "ArrowRight" : "ArrowLeft");
  await expect(page.getByTestId("verdict")).toContainText("Correct.");
});

test("best streak is saved per artist and shown on home", async ({ page, request }) => {
  const deck = await seededDeck(request);
  await page.goto("/");
  await expect(page.getByTestId("home-best")).toHaveText("0");
  await page.goto(playUrl);
  await guess(page, truthFor(deck[0]), "button");
  await page.getByRole("button", { name: "Back to home" }).click();
  await expect(page.getByTestId("home-best")).toHaveText("1");
  await page.reload();
  await expect(page.getByTestId("home-best")).toHaveText("1");
});
