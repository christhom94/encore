import { DAY, HttpError, PoliteFetcher } from "../http";
import type { SetlistArtist } from "./types";

// setlist.fm REST API (docs/DATA.md section 1). Server-side only.

export const API_BASE = "https://api.setlist.fm/rest/1.0";

/** Shared fetcher: one API request at a time, a second apart, cached on disk. */
export const apiFetcher = new PoliteFetcher({ minIntervalMs: 1000, cacheDir: ".cache/setlistfm-api" });

interface ApiArtist {
  mbid: string;
  name: string;
  sortName?: string;
  disambiguation?: string;
  url: string;
}

export interface ApiSong {
  name: string;
  tape?: boolean;
  cover?: { mbid?: string; name: string };
  info?: string;
}

export interface ApiSetlist {
  id: string;
  eventDate: string;
  sets?: { set?: Array<{ song?: ApiSong[]; encore?: number; name?: string }> };
}

export interface ApiSetlistPage {
  itemsPerPage: number;
  page: number;
  total: number;
  setlist?: ApiSetlist[];
}

function apiKey() {
  const key = process.env.SETLISTFM_API_KEY;
  if (!key) throw new Error("SETLISTFM_API_KEY is not set (see .env.example).");
  return key;
}

async function get<T>(path: string, cacheTtlMs = 0): Promise<T | null> {
  try {
    return await apiFetcher.getJson<T>(`${API_BASE}${path}`, {
      headers: { "x-api-key": apiKey(), Accept: "application/json", "Accept-Language": "en" },
      cacheTtlMs,
    });
  } catch (err) {
    // setlist.fm answers 404 for "no results".
    if (err instanceof HttpError && err.status === 404) return null;
    throw err;
  }
}

const toArtist = (a: ApiArtist): SetlistArtist => ({
  mbid: a.mbid,
  name: a.name,
  disambiguation: a.disambiguation?.trim() || null,
  url: a.url,
});

/** Artist search, most relevant first. Includes tribute acts: show disambiguation. */
export async function searchArtists(name: string): Promise<SetlistArtist[]> {
  const q = new URLSearchParams({ artistName: name, sort: "relevance" });
  const res = await get<{ artist?: ApiArtist[] }>(`/search/artists?${q}`, DAY);
  return (res?.artist ?? []).map(toArtist);
}

export async function getArtist(mbid: string): Promise<SetlistArtist | null> {
  const res = await get<ApiArtist>(`/artist/${encodeURIComponent(mbid)}`, 7 * DAY);
  return res ? toArtist(res) : null;
}

/** One page (20 setlists) of an artist's setlists, newest first. */
export async function getSetlistPage(mbid: string, page: number): Promise<ApiSetlistPage | null> {
  return get<ApiSetlistPage>(`/artist/${encodeURIComponent(mbid)}/setlists?p=${page}`, 7 * DAY);
}

/**
 * Pick the artist a name refers to: an exact (case-insensitive) name match
 * without disambiguation first, then any exact match, then the top result.
 */
export function pickArtist(results: SetlistArtist[], name: string): SetlistArtist | null {
  const exact = results.filter((a) => a.name.toLowerCase() === name.trim().toLowerCase());
  return exact.find((a) => !a.disambiguation) ?? exact[0] ?? results[0] ?? null;
}
