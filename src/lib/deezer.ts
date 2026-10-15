import { DAY, PoliteFetcher } from "./http";

// Deezer API (docs/DATA.md section 4). No key needed. Server-side only: the
// browser never calls Deezer's API (CORS, and everything goes through our server).

export const DEEZER_API = "https://api.deezer.com";

/** Deezer allows 50 requests per 5 seconds; stay well under it. */
export const deezerFetcher = new PoliteFetcher({ minIntervalMs: 150, cacheDir: ".cache/deezer" });

export interface DeezerArtist {
  id: number;
  name: string;
  nb_fan?: number;
  picture_xl?: string;
}

export interface DeezerAlbum {
  id: number;
  title: string;
  record_type?: string; // album | ep | single | compile
  release_date?: string; // YYYY-MM-DD
  cover_xl?: string;
}

export interface DeezerTrack {
  id: number;
  title: string;
  title_short?: string;
  title_version?: string;
  preview?: string;
  artist: { id: number; name: string };
  album?: DeezerAlbum;
}

interface Page<T> {
  data?: T[];
  next?: string;
  total?: number;
  error?: { type: string; message: string; code: number };
}

export class DeezerError extends Error {}

async function get<T extends { error?: Page<unknown>["error"] }>(url: string, cacheTtlMs = 0): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    // A cached quota error would stick, so bypass the cache on retries.
    const res = await deezerFetcher.getJson<T>(url, { cacheTtlMs: attempt ? 0 : cacheTtlMs });
    if (!res.error) return res;
    // Deezer reports errors with HTTP 200; code 4 is "quota exceeded".
    if (res.error.code === 4 && attempt < 3) {
      await new Promise((r) => setTimeout(r, 5000));
      continue;
    }
    throw new DeezerError(`Deezer ${res.error.type}: ${res.error.message} (${url})`);
  }
}

async function getAll<T>(url: string, cacheTtlMs: number): Promise<T[]> {
  const out: T[] = [];
  let next: string | undefined = url;
  while (next) {
    const page: Page<T> = await get<Page<T>>(next, cacheTtlMs);
    out.push(...(page.data ?? []));
    next = page.next;
  }
  return out;
}

export async function searchArtist(name: string): Promise<DeezerArtist[]> {
  const res = await get<Page<DeezerArtist>>(
    `${DEEZER_API}/search/artist?q=${encodeURIComponent(name)}&limit=10`,
    7 * DAY,
  );
  return res.data ?? [];
}

/** All of an artist's releases (albums, EPs, singles, compilations). */
export function artistAlbums(artistId: number): Promise<DeezerAlbum[]> {
  return getAll<DeezerAlbum>(`${DEEZER_API}/artist/${artistId}/albums?limit=100`, 7 * DAY);
}

export function albumTracks(albumId: number): Promise<DeezerTrack[]> {
  return getAll<DeezerTrack>(`${DEEZER_API}/album/${albumId}/tracks?limit=200`, 7 * DAY);
}

export function getAlbum(albumId: number): Promise<DeezerAlbum & { error?: Page<unknown>["error"] }> {
  return get(`${DEEZER_API}/album/${albumId}`, 7 * DAY);
}

/** Track search by title only (Deezer's artist:"…" filter currently returns nothing). */
export async function searchTrack(title: string): Promise<DeezerTrack[]> {
  const q = encodeURIComponent(`track:"${title.replace(/"/g, "")}"`);
  const res = await get<Page<DeezerTrack>>(`${DEEZER_API}/search?q=${q}&limit=50`, 7 * DAY);
  return res.data ?? [];
}

/** A fresh track (preview URLs expire, so this is never cached). */
export function getTrack(trackId: number): Promise<DeezerTrack & { error?: Page<unknown>["error"] }> {
  return get(`${DEEZER_API}/track/${trackId}`, 0);
}

// ---------------------------------------------------------------------------
// Matching (pure functions, unit tested)
// ---------------------------------------------------------------------------

/** Words that mark a bracketed or dashed suffix as a version, not part of the title. */
const VERSION =
  /\b(remaster(ed)?|live|version|edit|mix|demo|mono|stereo|remix|take \d+|rehearsal|acoustic|instrumental|deluxe|bonus|single|radio|session|rough|anniversary|cover|feat\.?|from|with|\d{4})\b/i;

/** A recording we would rather not use: live, demos, rough mixes, rehearsals… */
const VARIANT =
  /\b(live|demo|rough mix|take \d+|rehearsal|instrumental|karaoke|remix|edit|mix|riff tapes?|pre-production|acoustic)\b/i;

/** Album titles that are live records or compilations. */
const LIVE_OR_COMPILATION =
  /\b(live|s&m2?|binge & purge|helping hands|through the never|blacklist|greatest hits|best of|collection|anthology|tribute|karaoke|unplugged|sessions?|essentials?)\b/i;

function stripVersionSuffixes(title: string): string {
  let t = title.trim();
  for (;;) {
    const bracket = t.match(/^(.*\S)\s*[([]([^()[\]]*)[)\]]$/);
    if (bracket && VERSION.test(bracket[2])) {
      t = bracket[1].trim();
      continue;
    }
    const dash = t.match(/^(.*\S)\s+[-–—]\s+(.*)$/);
    if (dash && VERSION.test(dash[2])) {
      t = dash[1].trim();
      continue;
    }
    return t;
  }
}

/** Normalise a song title for matching (see docs/DATA.md section 4). */
export function normaliseTitle(title: string): string {
  return stripVersionSuffixes(title)
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** "Ride The Lightning (Deluxe Remaster)" → "Ride The Lightning" */
export function cleanAlbumTitle(title: string): string {
  return title
    .replace(
      /\s*[([][^()[\]]*(remaster|deluxe|box set|edition|expanded|anniversary|bonus)[^()[\]]*[)\]]\s*$/i,
      "",
    )
    .trim();
}

export const isVariant = (t: DeezerTrack) => VARIANT.test(`${t.title} ${t.title_version ?? ""}`);

/** Lower is better: studio albums first, then EPs and singles; live records and compilations last. */
export function albumScore(album: DeezerAlbum): number {
  let score = 0;
  if (LIVE_OR_COMPILATION.test(album.title)) score += 100;
  if (album.record_type === "compile") score += 80;
  if (/deluxe|box set/i.test(album.title)) score += 10;
  if (/remaster/i.test(album.title)) score += 2;
  if (album.record_type === "ep") score += 5;
  if (album.record_type === "single") score += 8;
  return score;
}

export interface Candidate {
  track: DeezerTrack;
  album: DeezerAlbum;
  /** The song is one part of a combined track such as "Last Caress/Green Hell". */
  partial?: boolean;
}

export function candidateScore({ track, album, partial }: Candidate): number {
  return albumScore(album) + (isVariant(track) ? 200 : 0) + (partial ? 50 : 0);
}

/** Index keys for a track: its title, plus each part of a combined "A/B" title. */
export function trackKeys(track: DeezerTrack): Array<{ key: string; partial: boolean }> {
  const title = track.title_short || track.title;
  const keys = [{ key: normaliseTitle(title), partial: false }];
  const parts = stripVersionSuffixes(title).split(/\s*\/\s*/);
  if (parts.length > 1) for (const p of parts) keys.push({ key: normaliseTitle(p), partial: true });
  return keys;
}

/** The best recording of a song among candidates by this artist, or null. */
export function pickBest(title: string, artistId: number, candidates: Candidate[]): Candidate | null {
  const want = normaliseTitle(title);
  const matches = candidates.filter(
    (c) =>
      c.track.artist.id === artistId &&
      (c.partial || normaliseTitle(c.track.title_short || c.track.title) === want),
  );
  matches.sort(
    (a, b) =>
      candidateScore(a) - candidateScore(b) ||
      (a.album.release_date ?? "9999").localeCompare(b.album.release_date ?? "9999"),
  );
  return matches[0] ?? null;
}

/** Original release year: the earliest release among albums with the same cleaned title. */
export function originalYear(album: DeezerAlbum, catalogue: DeezerAlbum[]): number | null {
  const title = cleanAlbumTitle(album.title).toLowerCase();
  const years = [album, ...catalogue.filter((a) => cleanAlbumTitle(a.title).toLowerCase() === title)]
    .map((a) => Number(a.release_date?.slice(0, 4)))
    .filter((y) => y > 1900);
  return years.length ? Math.min(...years) : null;
}

/** Pick the artist: exact (normalised) name match with the most fans. */
export function pickDeezerArtist(results: DeezerArtist[], name: string): DeezerArtist | null {
  const want = normaliseTitle(name);
  const exact = results.filter((a) => normaliseTitle(a.name) === want);
  return exact.sort((a, b) => (b.nb_fan ?? 0) - (a.nb_fan ?? 0))[0] ?? null;
}
