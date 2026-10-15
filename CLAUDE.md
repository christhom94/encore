# Encore: higher or lower, played live

A mobile-first web game. The player picks a band, then sees one song at a time with a number. They swipe right if they think the band has played that song live **more** times than the number, left if **fewer**. One wrong guess ends the run. Play counts come from setlist.fm; cover art and 30-second previews come from Deezer.

## How to work on this project

1. Read this file, then `docs/BUILD_PLAN.md`, then `docs/DESIGN.md` and `docs/DATA.md`.
2. Build **one stage at a time** from `docs/BUILD_PLAN.md`. At the end of each stage: run the tests, compare the UI with `design/screens/`, summarise what you did and any decisions you made, then **stop and wait for review** before starting the next stage.
3. The look and feel is already designed. `design/prototype/index.html` is the source of truth for layout, colours, type, motion and game flow. Open it, read its CSS and JS, and match it. Do not invent a new style.
4. If something in the docs is ambiguous, pick the simplest option that matches the prototype, note it in your stage summary, and carry on.
5. Commit at the end of each stage with a clear message.

## Stack (decided)

- Next.js (App Router, latest stable) + TypeScript (strict) + Tailwind CSS
- Motion (formerly Framer Motion) for the drag-to-swipe card
- Drizzle ORM. SQLite locally; hosted database at deploy (Stage 6)
- `cheerio` to parse setlist.fm stats pages, `sharp` for cover colour extraction
- Vitest for unit tests, Playwright for end-to-end and screenshot checks
- Fonts self-hosted (woff2 files in `design/prototype/fonts/`, or the `@fontsource/anton` and `@fontsource/schibsted-grotesk` packages)
- Node 20+

## Design in one paragraph (full spec: `docs/DESIGN.md`)

"Headliner" gig-poster style: concrete grey ground `#E3E1DC`, paper cards `#F8F6F2`, ink `#1C1C1F` text and 2.5px ink borders, rounded corners (cards 26px, tiles 20px, art 18px), pill buttons, hard offset shadows on the key element of each screen. Headings and all numbers in **Anton** (uppercase), body in **Schibsted Grotesk**. Screens are bento grids of tiles. **Higher** uses the accent colour, **Lower** is always charcoal `#2B2B30`. The accent defaults to red `#E4572E` but on the play and reveal screens it takes the **primary colour of the current song's album cover** (see "Album accent colour").

## Product decisions (from the client, do not change without asking)

- Play counts come from the **setlist.fm artist statistics pages** (e.g. `https://www.setlist.fm/stats/metallica-3bd680c8.html`), not by summing setlists. Summing via the API is the fallback. See `docs/DATA.md`.
- **Covers and medleys count.** Keep them in the deck. Display covers without the "(X cover)" suffix but keep the original artist in the data.
- Covers: Deezer album art (`cover_xl`). Band photos on tiles: Deezer artist picture (`picture_xl`), shown greyscale.
- Album accent colour drives the Higher button, Higher stamp, progress bar, streak chip and the coloured result tile.
- Credit setlist.fm (with a link) on every screen that shows play counts.

## Album accent colour

Computed **server-side at ingest** from the cover with `sharp`, stored with the album, never in the browser (Deezer images are cross-origin, so a browser canvas would be blocked). The algorithm is `extractAccent()` in `design/prototype/index.html`; port it exactly:

1. Resize the cover to 64×64. Ignore pixels with saturation < 0.35 or lightness outside 0.15 to 0.85.
2. Bucket the rest into 24 hue bins, weighting each pixel by `saturation × (1 − |lightness − 0.5| × 2)`. Take the heaviest bin's weighted average colour.
3. If that bin covers < 0.2% of pixels, return `null` (use the default red). Example: the Black Album returns `null`.
4. Clamp saturation to ≥ 0.5 and lightness to 0.45 to 0.72, then raise lightness until ink text on it has contrast ≥ 4.5:1.

At render, `themeFor(accent)` in the prototype derives `--on-higher` (ink or paper text) and `--accent-text` (a darker shade for small text on light tiles, ≥ 4.5:1). Port that too. Expected results for the sample covers: Master of Puppets `#DA621B`, …And Justice for All `#CFDB94`, Black Album `null`.

## Game rules

- Deck: the artist's songs with at least `MIN_PLAYS` (default 10) performances, shuffled, weighted towards the 60 most played so songs are recognisable. Non-song entries are excluded (see `docs/DATA.md`).
- The number shown ("the line"): `count × factor`, where `factor` is random in [0.60, 0.85] or [1.15, 1.40]. Round to the nearest 50 if count ≥ 500, nearest 10 if ≥ 50, else nearest 5. Never equal to the real count, never below 1. Aim for roughly half higher and half lower answers.
- Correct answer is "higher" if `count > line`, otherwise "lower".
- A wrong guess ends the run. Clearing the whole deck is a win ("Setlist cleared.").
- Best streak is stored per artist (localStorage at first).
- Fan levels by streak: Crowd 0 to 2, Roadie 3 to 7, Tour manager 8 to 11, Headliner 12+.
- "Played at" % = count ÷ total setlists, capped at 100%.

## Don'ts

- Don't call setlist.fm or Deezer from the browser. Everything goes through our server and our database.
- Don't scrape on a player's request. Ingest runs as a background job and results are cached (see `docs/DATA.md` for rate limits).
- Don't store Deezer preview URLs long-term; they expire. Store the Deezer track ID and fetch a fresh preview URL when serving a card.
- Don't commit `.env.local` or any API key.
- Don't overwrite `CLAUDE.md`, `docs/` or `design/` when scaffolding.

## Environment

See `.env.example`: `SETLISTFM_API_KEY`, `CONTACT_EMAIL` (sent in the User-Agent when fetching setlist.fm pages), `DATABASE_URL`.
