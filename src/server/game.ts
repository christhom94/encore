import { and, desc, eq, gte, isNotNull, isNull, like, sql } from "drizzle-orm";
import type { Db } from "@/db/client";
import { albums, artists, songs } from "@/db/schema";
import { MIN_PLAYS } from "@/ingest/deezer";
import { latestJob, queuePosition } from "@/ingest/queue";
import { buildDeck, MIN_DECK, type DeckSong } from "@/game/deck";
import { seededRng, type Rng } from "@/game/random";
import type { Artist, Card } from "@/game/types";
import { searchArtists } from "@/lib/setlistfm/api";

// Server-side reads for the game: decks, popular artists and search.

export type DeckResponse =
  | { status: "ready"; artist: Artist; deck: Card[] }
  | {
      status: "pending";
      artist: { id: string; name: string };
      job: "queued" | "running";
      position: number;
      /** What the worker is doing now, e.g. "Counting setlists: page 40 of 106". */
      progress: string | null;
    }
  | { status: "failed"; artist: { id: string; name: string }; reason: string; message: string }
  | { status: "too_few"; artist: Artist; eligible: number; needed: number; minPlays: number }
  | { status: "unknown" };

const toArtist = (a: typeof artists.$inferSelect): Artist => ({
  id: a.mbid,
  name: a.name,
  totalSetlists: a.totalSetlists ?? 0,
  photo: a.pictureUrl,
});

async function deckSongs(db: Db, mbid: string, minPlays: number): Promise<DeckSong[]> {
  const rows = await db
    .select({ song: songs, album: albums })
    .from(songs)
    .leftJoin(albums, eq(albums.deezerAlbumId, songs.deezerAlbumId))
    .where(and(eq(songs.artistMbid, mbid), isNull(songs.excludedReason), gte(songs.count, minPlays)));
  return rows.map(({ song, album }) => ({
    id: String(song.id),
    title: song.displayName,
    album: album?.title ?? "",
    year: album?.year ?? null,
    count: song.count,
    rank: song.rank ?? 9999,
    cover: album?.coverUrl ?? null,
    accent: album?.accent ?? null,
    trackId: song.deezerTrackId,
  }));
}

/** A fresh deck for an artist, or why there isn't one yet. */
export async function getDeck(
  db: Db,
  mbid: string,
  opts: { seed?: number; rng?: Rng } = {},
): Promise<DeckResponse> {
  const artist = await db.query.artists.findFirst({ where: eq(artists.mbid, mbid) });
  const job = await latestJob(db, mbid);

  if (job && (job.status === "queued" || job.status === "running")) {
    return {
      status: "pending",
      artist: { id: mbid, name: artist?.name ?? job.artistName },
      job: job.status,
      position: await queuePosition(db, job),
      progress: job.status === "running" ? job.progress : null,
    };
  }
  if (!artist?.countsUpdatedAt) {
    if (job?.status === "failed")
      return {
        status: "failed",
        artist: { id: mbid, name: job.artistName },
        reason: job.errorCode ?? "error",
        message: job.error ?? "Something went wrong fetching this artist.",
      };
    return { status: "unknown" };
  }

  const minPlays = MIN_PLAYS();
  const pool = await deckSongs(db, mbid, minPlays);
  if (pool.length < MIN_DECK)
    return { status: "too_few", artist: toArtist(artist), eligible: pool.length, needed: MIN_DECK, minPlays };

  const rng = opts.rng ?? (opts.seed !== undefined ? seededRng(opts.seed) : Math.random);
  return { status: "ready", artist: toArtist(artist), deck: buildDeck(pool, { minPlays, rng }) };
}

export interface PopularArtist extends Artist {
  playable: boolean;
}

/** Artists with counts, most setlists first. */
export async function popularArtists(db: Db, limit = 6): Promise<PopularArtist[]> {
  const minPlays = MIN_PLAYS();
  const rows = await db
    .select({
      artist: artists,
      eligible: sql<number>`(select count(*) from ${songs} where ${songs.artistMbid} = ${artists.mbid} and ${songs.excludedReason} is null and ${songs.count} >= ${minPlays})`,
    })
    .from(artists)
    .where(isNotNull(artists.countsUpdatedAt))
    .orderBy(desc(artists.totalSetlists))
    .limit(limit);
  return rows.map(({ artist, eligible }) => ({
    ...toArtist(artist),
    playable: Number(eligible) >= MIN_DECK,
  }));
}

export interface SearchResult {
  id: string;
  name: string;
  disambiguation: string | null;
  /** ready: playable now. new: needs fetching first (queues an ingest). */
  status: "ready" | "pending" | "new";
  photo: string | null;
  totalSetlists: number | null;
}

/** Our database first, then the setlist.fm API (cached, polite). */
/** Why setlist.fm search failed: no API key configured, or the API is down/rate limited. */
export type SearchApiError = "not_configured" | "unavailable";

export async function searchAll(
  db: Db,
  q: string,
): Promise<{ results: SearchResult[]; apiError?: SearchApiError }> {
  const query = q.trim();
  if (query.length < 2) return { results: [] };

  const local = await db
    .select()
    .from(artists)
    .where(
      and(isNotNull(artists.countsUpdatedAt), like(sql`lower(${artists.name})`, `%${query.toLowerCase()}%`)),
    )
    .orderBy(desc(artists.totalSetlists))
    .limit(5);
  const results: SearchResult[] = local.map((a) => ({
    id: a.mbid,
    name: a.name,
    disambiguation: a.disambiguation,
    status: "ready",
    photo: a.pictureUrl,
    totalSetlists: a.totalSetlists,
  }));

  let apiError: SearchApiError | undefined;
  try {
    for (const a of await searchArtists(query)) {
      if (results.length >= 8) break;
      if (results.some((r) => r.id === a.mbid)) continue;
      const job = await latestJob(db, a.mbid);
      results.push({
        id: a.mbid,
        name: a.name,
        disambiguation: a.disambiguation,
        status: job && (job.status === "queued" || job.status === "running") ? "pending" : "new",
        photo: null,
        totalSetlists: null,
      });
    }
  } catch (err) {
    // Still return what we have locally, and say why in the server log.
    apiError = process.env.SETLISTFM_API_KEY ? "unavailable" : "not_configured";
    console.warn(`[search] setlist.fm search failed: ${err instanceof Error ? err.message : err}`);
  }
  return { results, apiError };
}
