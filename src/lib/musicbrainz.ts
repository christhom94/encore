import { DAY, PoliteFetcher } from "./http";
import { normaliseTitle } from "./deezer";

// MusicBrainz, for the original release year of an album. Deezer often only
// carries remasters (e.g. "...And Justice for All (Remastered)", 2018).
// MusicBrainz asks for at most one request per second and an identifying User-Agent.

export const mbFetcher = new PoliteFetcher({ minIntervalMs: 1100, cacheDir: ".cache/musicbrainz" });

interface ReleaseGroupSearch {
  "release-groups"?: Array<{ title: string; score: number; "first-release-date"?: string }>;
}

const phrase = (s: string) => `"${s.replace(/["\\]/g, "\\$&")}"`;

/** Year of the first release of an album by this artist (MusicBrainz artist ID = setlist.fm mbid). */
export async function firstReleaseYear(artistMbid: string, albumTitle: string): Promise<number | null> {
  const query = `releasegroup:${phrase(albumTitle)} AND arid:${artistMbid}`;
  const url = `https://musicbrainz.org/ws/2/release-group?query=${encodeURIComponent(query)}&fmt=json&limit=10`;
  try {
    const res = await mbFetcher.getJson<ReleaseGroupSearch>(url, { cacheTtlMs: 30 * DAY });
    return yearFromReleaseGroups(res, albumTitle);
  } catch {
    return null; // the year is a nicety; never fail an ingest over it
  }
}

export function yearFromReleaseGroups(res: ReleaseGroupSearch, albumTitle: string): number | null {
  const want = normaliseTitle(albumTitle);
  const years = (res["release-groups"] ?? [])
    .filter((g) => g.score >= 90 && normaliseTitle(g.title) === want)
    .map((g) => Number(g["first-release-date"]?.slice(0, 4)))
    .filter((y) => y > 1900);
  return years.length ? Math.min(...years) : null;
}
