import { and, eq, isNotNull, isNull } from "drizzle-orm";
import type { Db } from "@/db/client";
import { albums, artists, ingestRuns, songs } from "@/db/schema";
import { extractAccent } from "@/lib/accent";
import {
  albumTracks,
  artistAlbums,
  cleanAlbumTitle,
  getAlbum,
  normaliseTitle,
  originalYear,
  pickBest,
  pickDeezerArtist,
  searchArtist,
  searchTrack,
  trackKeys,
  type Candidate,
  type DeezerAlbum,
} from "@/lib/deezer";
import { userAgent } from "@/lib/http";
import { firstReleaseYear } from "@/lib/musicbrainz";

export const MIN_PLAYS = () => Number(process.env.MIN_PLAYS) || 10;

export interface DeezerSummary {
  deezerArtist: { id: number; name: string } | null;
  /** Songs considered (kept songs without a match yet, or all with force). */
  considered: number;
  matched: number;
  /** Deck-eligible songs (MIN_PLAYS+) with no Deezer match. */
  unmatched: Array<{ name: string; count: number }>;
  /** Rarely played songs (below MIN_PLAYS) with no match; only counted. */
  unmatchedRare: number;
  albumsAdded: number;
  accents: Array<{ album: string; accent: string | null }>;
}

interface Options {
  force?: boolean;
  runId?: number;
  progress?: (msg: string) => void;
}

/**
 * Match an artist's songs to Deezer recordings: store the track and album IDs,
 * the album (title, original year, cover) and its accent colour, and the
 * artist's photo. Matching uses the artist's own catalogue first (preferring
 * studio albums) and falls back to a title search for deck-eligible songs.
 */
export async function ingestDeezer(db: Db, mbid: string, opts: Options = {}): Promise<DeezerSummary> {
  const artist = await db.query.artists.findFirst({ where: eq(artists.mbid, mbid) });
  if (!artist) throw new Error(`Artist ${mbid} has no counts yet; ingest counts first.`);
  const summary: DeezerSummary = {
    deezerArtist: null,
    considered: 0,
    matched: 0,
    unmatched: [],
    unmatchedRare: 0,
    albumsAdded: 0,
    accents: [],
  };

  // 1. The artist and their photo.
  const dz = pickDeezerArtist(await searchArtist(artist.name), artist.name);
  if (!dz) return summary;
  summary.deezerArtist = { id: dz.id, name: dz.name };
  await db
    .update(artists)
    .set({ deezerArtistId: dz.id, pictureUrl: dz.picture_xl ?? null })
    .where(eq(artists.mbid, mbid));

  // 2. The artist's catalogue: every release and its tracks.
  const catalogue = await artistAlbums(dz.id);
  const byTitle = new Map<string, Candidate[]>();
  for (const [i, album] of catalogue.entries()) {
    opts.progress?.(`Deezer catalogue ${i + 1}/${catalogue.length}`);
    for (const track of await albumTracks(album.id)) {
      for (const { key, partial } of trackKeys(track)) {
        byTitle.set(key, [...(byTitle.get(key) ?? []), { track, album, partial }]);
      }
    }
  }

  // 3. Match songs.
  const minPlays = MIN_PLAYS();
  const todo = await db
    .select()
    .from(songs)
    .where(
      and(
        eq(songs.artistMbid, mbid),
        isNull(songs.excludedReason),
        opts.force ? undefined : isNull(songs.deezerTrackId),
      ),
    );
  summary.considered = todo.length;

  for (const [i, song] of todo.entries()) {
    opts.progress?.(`Matching ${i + 1}/${todo.length}`);
    let best = pickBest(song.displayName, dz.id, byTitle.get(normaliseTitle(song.displayName)) ?? []);
    if (!best && song.count >= minPlays) {
      // Fallback: title search, keeping only this artist's recordings.
      const found = (await searchTrack(song.displayName)).filter((t) => t.artist.id === dz.id && t.album);
      const candidates: Candidate[] = [];
      for (const t of found.slice(0, 5)) {
        const album = catalogue.find((a) => a.id === t.album!.id) ?? (await getAlbum(t.album!.id));
        candidates.push({ track: t, album });
      }
      best = pickBest(song.displayName, dz.id, candidates);
    }
    if (!best) {
      if (song.count >= minPlays) summary.unmatched.push({ name: song.displayName, count: song.count });
      else summary.unmatchedRare++;
      continue;
    }

    await ensureAlbum(db, mbid, best.album, catalogue, summary);
    await db
      .update(songs)
      .set({ deezerTrackId: best.track.id, deezerAlbumId: best.album.id })
      .where(eq(songs.id, song.id));
    summary.matched++;
  }

  // 4. Record the outcome on the ingest run.
  const matchedTotal = (
    await db
      .select({ id: songs.id })
      .from(songs)
      .where(and(eq(songs.artistMbid, mbid), isNull(songs.excludedReason), isNotNull(songs.deezerTrackId)))
  ).length;
  const notes = {
    deezerArtistId: dz.id,
    unmatched: summary.unmatched,
    unmatchedRare: summary.unmatchedRare,
  };
  if (opts.runId) {
    const run = await db.query.ingestRuns.findFirst({ where: eq(ingestRuns.id, opts.runId) });
    await db
      .update(ingestRuns)
      .set({
        songsMatched: matchedTotal,
        notes: JSON.stringify({ ...JSON.parse(run?.notes ?? "{}"), ...notes }),
      })
      .where(eq(ingestRuns.id, opts.runId));
  } else {
    await db.insert(ingestRuns).values({
      artistMbid: mbid,
      source: "deezer",
      startedAt: new Date(),
      finishedAt: new Date(),
      songsMatched: matchedTotal,
      notes: JSON.stringify(notes),
    });
  }
  return summary;
}

/** Insert the album once, with its original year and accent colour. */
async function ensureAlbum(
  db: Db,
  artistMbid: string,
  album: DeezerAlbum,
  catalogue: DeezerAlbum[],
  summary: DeezerSummary,
) {
  const existing = await db.query.albums.findFirst({ where: eq(albums.deezerAlbumId, album.id) });
  if (existing) return;
  let accent: string | null = null;
  if (album.cover_xl) {
    try {
      const res = await fetch(album.cover_xl, { headers: { "User-Agent": userAgent() } });
      if (res.ok) accent = await extractAccent(Buffer.from(await res.arrayBuffer()));
    } catch {
      accent = null; // keep the default red rather than fail the ingest
    }
  }
  const title = cleanAlbumTitle(album.title);
  // Deezer may only carry a remaster; MusicBrainz knows when the album first came out.
  const years = [originalYear(album, catalogue), await firstReleaseYear(artistMbid, title)].filter(
    (y): y is number => !!y,
  );
  await db
    .insert(albums)
    .values({
      deezerAlbumId: album.id,
      title,
      year: years.length ? Math.min(...years) : null,
      coverUrl: album.cover_xl ?? null,
      accent,
    })
    .onConflictDoNothing();
  summary.albumsAdded++;
  summary.accents.push({ album: title, accent });
}
