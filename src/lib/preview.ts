import { getTrack } from "./deezer";

// Fresh Deezer preview URLs. They carry a signed expiry (hdnea=exp=<unix>),
// so we never store them: look up the track when a card is served and keep
// the answer in memory until shortly before it expires.

const cache = new Map<number, { url: string | null; until: number }>();
const SAFETY_MS = 2 * 60 * 1000;
const FALLBACK_TTL_MS = 10 * 60 * 1000;
const MAX_ENTRIES = 2000;

/** Expiry of a signed preview URL, in ms, or null if it has none. */
export function previewExpiry(url: string): number | null {
  const m = url.match(/exp=(\d+)/);
  return m ? Number(m[1]) * 1000 : null;
}

export async function previewUrl(trackId: number, now = Date.now()): Promise<string | null> {
  const hit = cache.get(trackId);
  if (hit && hit.until > now) return hit.url;

  const track = await getTrack(trackId);
  const url = track.preview || null;
  const expires = url ? previewExpiry(url) : null;
  const until = expires ? expires - SAFETY_MS : now + FALLBACK_TTL_MS;
  if (cache.size >= MAX_ENTRIES) cache.delete(cache.keys().next().value!);
  cache.set(trackId, { url, until: Math.max(until, now + 30_000) });
  return url;
}
