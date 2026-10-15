import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3100);

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "phone",
      // 390×844 at 2x is the design reference (design/screens).
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 2,
        // Deep links in the screenshot tests open a card without a tap first.
        launchOptions: { args: ["--autoplay-policy=no-user-gesture-required"] },
      },
    },
  ],
  // A production build: steadier than the dev server for screenshots.
  webServer: {
    command: `tsx tests/e2e/seed.ts && npm run build && npm run start -- --port ${PORT}`,
    env: {
      NEXT_PUBLIC_REVIEW_LINKS: "1",
      // A seeded database and no network: no worker, no setlist.fm key.
      DATABASE_URL: "file:./e2e.db",
      INGEST_WORKER: "off",
      SETLISTFM_API_KEY: "",
      // Songs played 1,000+ times: an 11-card Metallica deck keeps full runs short.
      MIN_PLAYS: "1000",
    },
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 240_000,
  },
});
