import { DAY, PoliteFetcher } from "./http";
import { normaliseTitle } from "./deezer";

// MusicBrainz, for the original release year of an album. Deezer often only
// carries remasters (e.g. "...And Justice for All (Remastered)", 2018), so we
// browse the artist's release groups once per ingest.
// MusicBrainz asks for at most one request per second and an identifying User-Agent.

export const mbFetcher = new PoliteFetcher({ minIntervalMs: 1100, cacheDir: ".cache/musicbrainz" });

interface ReleaseGroupBrowse {
  "release-groups"?: Array<{ title: string; "first-release-date"?: string }>;
  "release-group-count"?: number;
}

/**
 * First-release year of every release group by this artist, keyed by
 * normalised title: one or two requests per artist instead of one per album.
 */
export async function releaseYears(artistMbid: string): Promise<Map<string, number>> {
  const years = new Map<string, number>();
  try {
    for (let offset = 0, total = 1; offset < total && offset < 500; offset += 100) {
      const url = `https://musicbrainz.org/ws/2/release-group?artist=${artistMbid}&limit=100&offset=${offset}&fmt=json`;
      const page = await mbFetcher.getJson<ReleaseGroupBrowse>(url, { cacheTtlMs: 30 * DAY });
      total = page["release-group-count"] ?? 0;
      addYears(years, page["release-groups"] ?? []);
    }
  } catch {
    // Years are a nicety; fall back to Deezer's dates.
  }
  return years;
}

/** Keep the earliest year per normalised title. */
export function addYears(
  years: Map<string, number>,
  groups: Array<{ title: string; "first-release-date"?: string }>,
): Map<string, number> {
  for (const g of groups) {
    const year = Number(g["first-release-date"]?.slice(0, 4));
    const key = normaliseTitle(g.title);
    if (year > 1900 && (!years.has(key) || year < years.get(key)!)) years.set(key, year);
  }
  return years;
}
