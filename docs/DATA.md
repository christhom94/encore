# Data sources

Nothing here is called from the browser. Ingest runs as a background job or CLI, writes to our database, and the game reads from the database.

## 1. Finding the artist (setlist.fm API)

- Base URL: `https://api.setlist.fm/rest/1.0`
- Headers: `x-api-key: $SETLISTFM_API_KEY`, `Accept: application/json`
- Search: `GET /search/artists?artistName=<name>&sort=relevance`
- Each result has `mbid` (MusicBrainz ID, our stable key), `name`, `disambiguation` and `url`, e.g. `https://www.setlist.fm/setlists/metallica-3bd680c8.html`.
- Search also returns tribute acts (Moretallica, Meatallica). Show `disambiguation` in the search results and always key artists by `mbid`, never by name.
- The free API key has rate limits. Keep to one request at a time with a short delay, and handle `429` with backoff.

## 2. Play counts (setlist.fm stats page, as decided by the client)

- Stats URL: take the artist `url` and replace `/setlists/` with `/stats/`, e.g. `https://www.setlist.fm/stats/metallica-3bd680c8.html`.
- The page lists each song with its number of performances, plus the total number of setlists. Inspect the real HTML and write the parser against it. Save a copy as a test fixture.
- Handle pagination or "show more" if the page splits long song lists. Check the page and its links before assuming everything is on one page.
- Example values (October 2026): Master of Puppets 1803, Creeping Death 1683, Seek & Destroy 1652, For Whom the Bell Tolls 1650, One 1646, Enter Sandman 1464, Sad but True 1443; total setlists 2198.
- Fetching rules: one request at a time, at least 2 seconds apart; a User-Agent naming the app and `CONTACT_EMAIL`; cache each artist's result for 7 days; re-ingest weekly in production.
- **Terms of use:** scraping the website is not the same as using the API. Before launching publicly, check setlist.fm's terms of use and API terms, and ask setlist.fm for permission if in doubt. To make switching easy, both sources sit behind one interface, `getSongCounts(artist) → { songs: {name, count, isCover, originalArtist}[], totalSetlists }`, chosen by the `COUNT_SOURCE=stats|aggregate` config.
- **Fallback (`aggregate`):** `GET /artist/{mbid}/setlists?p=N` (20 setlists per page; Metallica is about 110 pages). Count every `sets.set[].song[]` entry except `tape: true`. Counts may differ slightly from the stats page.

## 3. What counts as a song

- **Keep covers.** setlist.fm marks them (`cover` in the API, "(X cover)" on the stats page). Store `isCover` and `originalArtist`; display the title without the suffix.
- **Keep medleys.** Store them as they appear.
- **Exclude non-song entries**, configurable in `src/lib/setlistfm/filters.ts`: tapes and intros played over the PA, and entries whose name is only an instrument solo or jam (e.g. "Guitar Solo", "Drum Solo", "Bass Solo", "Jam"). Log what was excluded in the ingest summary so it can be reviewed.
- `MIN_PLAYS` (default 10) applies when building decks, not at ingest.

## 4. Covers, years, previews and artist photos (Deezer API)

- No API key needed. Base URL `https://api.deezer.com`.
- Track search: `GET /search?q=artist:"Metallica" track:"Master of Puppets"`. Each result has `id`, `title`, `preview` (30s MP3), `artist.name`, `album.id`, `album.title`, `album.cover_xl` (1000×1000).
- Release year: `GET /album/{id}` → `release_date`.
- Artist photo: `GET /search/artist?q=Metallica` → `picture_xl`. Shown greyscale on home tiles.
- Matching: normalise both titles (lowercase, strip punctuation, "&" → "and", remove suffixes such as "(Remastered…)", "- Live", "(Live at…)", "(… cover)"). Require the artist to match. Prefer original studio albums over live albums, compilations and remasters when choosing which album's cover to use (reject album titles containing Live, Greatest Hits, S&M and so on unless nothing else matches).
- Covers of other artists' songs: search with our artist as the artist (we want their recording).
- **Preview URLs expire.** Store the Deezer track ID and fetch a fresh `preview` (`GET /track/{id}`) when serving a card, via our own API route.
- Deezer API responses can't reliably be used from a browser (CORS), which is another reason everything goes through our server.
- Unmatched songs: keep them in the deck with the halftone placeholder and the default accent; list them in the ingest summary.

## 5. Album accent colour

Computed at ingest, once per album, with `sharp`, from `cover_xl`. Algorithm and thresholds are in `CLAUDE.md` ("Album accent colour") and in `extractAccent()` in `design/prototype/index.html`. Store as a hex string or `null`.

Expected results for the sample covers (test fixtures in `design/prototype/assets/`):

| Cover | Accent |
| --- | --- |
| master-of-puppets.png | `#DA621B` (orange) |
| ajfa.jpg (…And Justice for All) | `#CFDB94` (logo green) |
| black-album.jpg | `null` → default red `#E4572E` |

## 6. Suggested schema

- `artists`: `mbid` (pk), `name`, `disambiguation`, `setlistfm_url`, `stats_url`, `total_setlists`, `deezer_artist_id`, `picture_url`, `counts_updated_at`
- `albums`: `deezer_album_id` (pk), `title`, `year`, `cover_url`, `accent`
- `songs`: `id`, `artist_mbid`, `name`, `display_name`, `count`, `rank`, `is_cover`, `original_artist`, `is_medley`, `deezer_track_id`, `deezer_album_id`, `excluded_reason`
- `ingest_runs`: `id`, `artist_mbid`, `source`, `started_at`, `finished_at`, `songs_found`, `songs_matched`, `notes`

## 7. Attribution

- setlist.fm: "Counts from setlist.fm" with a link, on every screen that shows counts (already in the design).
- Deezer: covers and previews come from Deezer; add a small "Previews from Deezer" credit near the preview control or in the footer.
