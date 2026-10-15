# Build plan

Work through these stages in order. Finish each one completely, run the checks listed under "Done when", summarise, commit, and **stop for review** before the next stage.

---

## Stage 0: Project setup

- The folder already contains `CLAUDE.md`, `docs/`, `design/`, `.env.example` and `.gitignore`. `create-next-app` refuses non-empty folders, so scaffold into a temporary folder and move the generated files in (or set up by hand). Do not overwrite the existing files.
- Next.js (App Router) + TypeScript strict + Tailwind + ESLint + Prettier.
- Vitest and Playwright installed and wired to `npm test` and `npm run test:e2e`.
- Self-host Anton (400) and Schibsted Grotesk (400 to 700).
- Put the design tokens from `docs/DESIGN.md` into CSS variables and the Tailwind theme. Keep the variable names from the prototype (`--bg`, `--paper`, `--ink`, `--muted`, `--higher`, `--on-higher`, `--lower`, `--tile`, `--accent-text`).
- `.env.local` loaded from `.env.example`.

**Done when:** `npm run dev` serves a page showing the tokens (swatches, both fonts at their weights), and `npm test` runs one passing test.

---

## Stage 1: The game UI on sample data

Rebuild the prototype as React components, using the sample `DECK` from `design/prototype/index.html` (move it into `src/data/sample-deck.ts`, along with the sample images from `design/prototype/assets/` into `public/sample/`).

- Screens: Home, Play, Reveal, Game over. Match `design/screens/01` to `07` at 390×844.
- Components (suggested): `Header`, `StreakChip`, `Tile` (variants: paper, dark, accent, recessed, dashed, hero, photo), `SongCard`, `SwipeDeck`, `Stamp`, `ChoiceButtons`, `LineBox`, `PreviewBar`, `RunStrip`, `ResultGrid`.
- Swipe with Motion: drag on the x axis, rotate `x / 18` degrees, commit past 90px, fly off over 300ms, spring back otherwise. Stamps fade in with drag distance; the matching button lifts and the other dims. Buttons and keyboard arrows also work.
- Album accent theming: port `themeFor()` and apply the current song's accent as CSS variables on play and reveal, default red elsewhere.
- The preview button toggles state only (audio arrives in Stage 3).
- Game state in a reducer (`src/game/`), with unit tests: correct/incorrect, streak, best streak, game over, deck cleared.
- Respect `prefers-reduced-motion`.

**Done when:** you can play a full run on sample data with drag, buttons and keyboard; Playwright takes screenshots of each screen and they match `design/screens/` closely; reducer tests pass.

---

## Stage 2: Play counts from setlist.fm

Follow `docs/DATA.md` sections 1 to 3.

- Database schema (Drizzle): `artists`, `songs`, `albums`, `ingest_runs`.
- `src/lib/setlistfm/api.ts`: artist search via the setlist.fm API.
- `src/lib/setlistfm/stats.ts`: fetch and parse the artist stats page with `cheerio`. Save a real page as a test fixture (`tests/fixtures/metallica-stats.html`) and unit test the parser against it (Master of Puppets 1803, Creeping Death 1683, Seek & Destroy 1652, total setlists 2198 at the time of writing; assert structure, not exact numbers, so the test survives updates).
- Fallback `src/lib/setlistfm/aggregate.ts`: sum song entries across all setlists via the API, behind the same interface (`getSongCounts(artist)`), selected by config.
- Song filtering per `docs/DATA.md` section 3 (covers and medleys kept).
- CLI: `npm run ingest -- "Metallica"` resolves the artist, pulls counts, writes to the database, and prints a summary.
- Polite fetching: one request at a time, at least 2 seconds apart, identifying User-Agent, cache for 7 days.

**Done when:** `npm run ingest -- "Metallica"` stores the songs with counts; parser and filter tests pass.

---

## Stage 3: Covers, previews and accent colours from Deezer

Follow `docs/DATA.md` sections 4 and 5.

- `src/lib/deezer.ts`: find each song's track (title normalisation and studio-album preference), store the Deezer track ID, album ID, album title, release year and `cover_xl` URL. Store the artist's `picture_xl`.
- `src/lib/accent.ts`: port `extractAccent()` using `sharp`; store the accent per album. Unit test: the three sample covers in `public/sample/` give `#DA621B`, `#CFDB94` and `null` (±2 per channel is fine).
- Extend the ingest CLI to run this after Stage 2.
- An API route returns a fresh preview URL for a track ID (preview URLs expire).
- Real 30-second preview playback on the card: starts when the card appears (after the player's first tap, because browsers block autoplay before that), pauses on swipe, and the progress bar follows the audio.
- Songs with no Deezer match keep the halftone placeholder and the default accent.

**Done when:** ingest stores covers, years and accents for most Metallica songs, and the summary lists the unmatched ones; accent tests pass.

---

## Stage 4: Wire the game to real data

- API routes: `GET /api/artists/search?q=` (from our database first, then the setlist.fm API), `GET /api/game/[artistId]/deck` (builds a deck per the game rules in `CLAUDE.md`).
- Line generator in `src/game/line.ts` with unit tests (rounding rules, never equal, never below 1, roughly balanced).
- Home: working search (debounced, shows disambiguation such as tribute acts), "Popular now" tiles from the database with greyscale Deezer artist photos.
- Searching for an artist that has not been ingested queues an ingest and shows a friendly "Tuning up…" state. Never scrape inside the request.
- Edge cases: too few songs (fewer than 10 with `MIN_PLAYS`), no stats page, no setlists.

**Done when:** you can search Metallica, play a full run on real data, and the reveal shows real counts, % and rank.

---

## Stage 5: Polish

- Share streak: Web Share API with a clipboard fallback. Optional share image (OG image route) in the poster style.
- Best streak per artist (localStorage), shown on home and game over.
- Daily encore: the same 10 songs for everyone each day (seeded by date), with one attempt per day.
- How-to-play sheet from the "?" button.
- Loading skeletons in the poster style, error states, 404.
- Accessibility pass: contrast (including accent combinations), focus styles, 44px targets, `aria-live` for results, keyboard play, reduced motion.

**Done when:** a Lighthouse accessibility score of at least 95 on each screen, and the Playwright suite covers a full run, a loss, a win and the daily mode.

---

## Stage 6: Deploy

- Vercel (or similar) with a hosted database (Postgres, or Turso if staying on SQLite).
- Scheduled re-ingest (weekly) for artists already in the database.
- Response caching for deck and search routes.
- Before going public: check setlist.fm's terms for using the stats pages and contact them if needed (see `docs/DATA.md`).

**Done when:** a production URL works on a phone end to end.
