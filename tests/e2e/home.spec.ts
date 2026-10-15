import { expect, test } from "@playwright/test";
import { mockPreviews } from "./helpers";
import { E2E } from "./seed";

test.beforeEach(async ({ page }) => {
  await mockPreviews(page, "hang");
});

test("Popular now lists artists from the database, most setlists first", async ({ page }) => {
  await page.goto("/");
  const hero = page.getByRole("button", { name: /Metallica/ });
  await expect(hero).toContainText("2,198 setlists");
  await expect(page.getByRole("button", { name: "Oasis" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Pearl Jam" })).toBeVisible();
  // Not enough songs: not offered as a tile.
  await expect(page.getByRole("button", { name: "Tiny Band" })).toHaveCount(0);

  await hero.click();
  await expect(page).toHaveURL(new RegExp(`/play/${E2E.metallica}$`));
  await expect(page.getByTestId("top-card")).toBeVisible();
});

test("search finds artists in our database (setlist.fm is offline in tests)", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("searchbox").fill("metal");
  const results = page.getByTestId("search-results");
  await expect(results.getByRole("button", { name: /Metallica/ })).toContainText("Play");
  await expect(page.getByText("setlist.fm search needs an API key")).toBeVisible();
  await results.getByRole("button", { name: /Metallica/ }).click();
  await expect(page.getByTestId("top-card")).toBeVisible();
});

test("an artist we haven't fetched yet shows Tuning up until the ingest finishes", async ({ page }) => {
  const mbid = "00000000-0000-4000-8000-0000000000aa";
  const res = await page.request.post(`/api/artists/${mbid}/ingest`, { data: { name: "Queued Band" } });
  expect(res.status()).toBe(202);
  await page.goto(`/play/${mbid}`);
  const waiting = page.getByTestId("waiting");
  await expect(waiting).toHaveAttribute("data-status", "pending");
  await expect(waiting).toContainText("Tuning up…");
  await expect(waiting).toContainText("Queued Band");
});

test("edge cases explain themselves", async ({ page }) => {
  await page.goto(`/play/${E2E.tooFew}`);
  await expect(page.getByTestId("waiting")).toContainText("Not enough songs.");
  await expect(page.getByTestId("waiting")).toContainText("only 3 songs played 1000+ times");

  await page.goto(`/play/${E2E.failed}`);
  await expect(page.getByTestId("waiting")).toContainText("No setlists yet.");

  await page.goto("/play/00000000-0000-4000-8000-0000000000ff");
  await expect(page.getByTestId("waiting")).toContainText("Who's that?");
  await page.getByRole("button", { name: "Pick another band" }).click();
  await expect(page).toHaveURL(/\/$/);
});
