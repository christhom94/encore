import * as cheerio from "cheerio";
import { DAY, HttpError, PoliteFetcher } from "../http";
import type { SetlistArtist, SongCount, SongCounts } from "./types";

// setlist.fm artist statistics pages (docs/DATA.md section 2): the client's
// chosen source of play counts. Fetched politely and cached for 7 days.

/** Pages on www.setlist.fm: one at a time, at least 2 seconds apart. */
export const statsFetcher = new PoliteFetcher({ minIntervalMs: 2000, cacheDir: ".cache/setlistfm-stats" });

export const STATS_TTL = 7 * DAY;

/** https://www.setlist.fm/setlists/metallica-3bd680c8.html → …/stats/metallica-3bd680c8.html */
export function statsUrlFor(artistUrl: string): string {
  return artistUrl.replace("/setlists/", "/stats/");
}

/** Thrown when the page no longer looks like the one the parser was written for. */
export class StatsPageError extends Error {}

/** setlist.fm's bot protection refused the request (it wants a browser challenge solved). */
export class StatsBlockedError extends Error {
  constructor(readonly url: string) {
    super(`setlist.fm's bot protection blocked the stats page (${url}). Use the API source instead.`);
  }
}

/**
 * Parse a stats page (tests/fixtures/metallica-stats.html is a saved copy).
 * The page lists every song on one page, in table.statsTable, one
 * tr.songRow per song. Tape plays are not included in its counts. Covers
 * carry "(<a>Original Artist</a> <span>cover</span>)" after the title.
 */
export function parseStatsPage(html: string): SongCounts {
  const $ = cheerio.load(html);

  const table = $("table.statsTable").first();
  if (!table.length) throw new StatsPageError("No song table (table.statsTable) on the stats page.");
  // Today the whole list is on one page. If setlist.fm starts paginating, fail loudly.
  if ($(".artistSongs .pagination, .artistSongs a[href*='page=']").length)
    throw new StatsPageError("The stats page is paginated; the parser needs updating to follow pages.");

  const songs: SongCount[] = [];
  table.find("tr.songRow").each((_, row) => {
    const r = $(row);
    const nameCell = r.find("td.songName");
    const name =
      nameCell.find("a.songName").first().text().trim() || nameCell.attr("data-stats-sort")?.trim() || "";
    const count = Number(
      r.find("td.songCount").attr("data-stats-sort") ?? r.find("td.songCount").text().trim(),
    );
    if (!name || !Number.isFinite(count)) return;

    const coverLabel = nameCell.find("span").filter((_, s) => $(s).text().trim().toLowerCase() === "cover");
    const originalArtist = coverLabel.length ? coverLabel.prev("a").text().trim() || null : null;
    songs.push({ name, count, isCover: !!coverLabel.length, originalArtist });
  });
  if (songs.length === 0) throw new StatsPageError("No song rows (tr.songRow) found on the stats page.");

  // "All setlist songs (2198)": the setlist count links to the artist's setlist search.
  const allLink = $('a[title="Show song statistics of all setlists"]').first();
  const totalText = allLink.parent().find('a[href*="search?artist="]').first().text().replace(/[^\d]/g, "");
  const totalSetlists = Number(totalText);
  if (!totalSetlists) throw new StatsPageError("Could not read the total number of setlists.");

  return { songs, totalSetlists };
}

export async function getSongCountsByStats(
  artist: SetlistArtist,
  progress?: (msg: string) => void,
): Promise<SongCounts> {
  const url = statsUrlFor(artist.url);
  progress?.(`Fetching ${url}`);
  try {
    return parseStatsPage(await statsFetcher.getText(url, { cacheTtlMs: STATS_TTL }));
  } catch (err) {
    if (err instanceof HttpError && err.status === 404) return { songs: [], totalSetlists: 0 };
    if (err instanceof HttpError && err.challenged) throw new StatsBlockedError(url);
    throw err;
  }
}
