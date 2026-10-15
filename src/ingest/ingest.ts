import { and, eq, notInArray } from "drizzle-orm";
import type { Db } from "@/db/client";
import { artists, ingestRuns, songs } from "@/db/schema";
import { DAY } from "@/lib/http";
import { statsUrlFor } from "@/lib/setlistfm/stats";
import type { CountSource, GetSongCounts, SetlistArtist } from "@/lib/setlistfm/types";
import { prepareSongs, type PreparedSong } from "./prepare";

export const COUNTS_TTL = 7 * DAY;

export interface IngestSummary {
  artist: SetlistArtist;
  source: CountSource;
  /** True when counts were fresh (< 7 days) and nothing was fetched. */
  cached: boolean;
  totalSetlists: number;
  kept: PreparedSong[];
  excluded: PreparedSong[];
  runId?: number;
}

interface IngestOptions {
  source: CountSource;
  getSongCounts: GetSongCounts;
  force?: boolean;
  now?: () => Date;
}

/** Pull play counts for one artist and write them to the database. */
export async function ingestCounts(
  db: Db,
  artist: SetlistArtist,
  opts: IngestOptions,
): Promise<IngestSummary> {
  const now = opts.now ?? (() => new Date());

  const existing = await db.query.artists.findFirst({ where: eq(artists.mbid, artist.mbid) });
  const fresh =
    existing?.countsUpdatedAt && now().getTime() - existing.countsUpdatedAt.getTime() < COUNTS_TTL;
  if (fresh && !opts.force) {
    const rows = await db.select().from(songs).where(eq(songs.artistMbid, artist.mbid));
    const prepared = rows.map((r): PreparedSong => ({
      name: r.name,
      displayName: r.displayName,
      count: r.count,
      rank: r.rank,
      isCover: r.isCover,
      originalArtist: r.originalArtist,
      isMedley: r.isMedley,
      excludedReason: r.excludedReason as PreparedSong["excludedReason"],
    }));
    return summarise(artist, opts.source, existing.totalSetlists ?? 0, prepared, true);
  }

  const [run] = await db
    .insert(ingestRuns)
    .values({ artistMbid: artist.mbid, source: opts.source, startedAt: now() })
    .returning({ id: ingestRuns.id });

  try {
    const counts = await opts.getSongCounts(artist);
    if (counts.songs.length === 0) throw new Error(`No songs found for ${artist.name}.`);
    const rows = prepareSongs(counts);

    await db.transaction(async (tx) => {
      const artistRow = {
        name: artist.name,
        disambiguation: artist.disambiguation,
        setlistfmUrl: artist.url,
        statsUrl: statsUrlFor(artist.url),
        totalSetlists: counts.totalSetlists,
        countsUpdatedAt: now(),
      };
      await tx
        .insert(artists)
        .values({ mbid: artist.mbid, ...artistRow })
        .onConflictDoUpdate({ target: artists.mbid, set: artistRow });

      for (const r of rows) {
        const values = {
          displayName: r.displayName,
          count: r.count,
          rank: r.rank,
          isCover: r.isCover,
          originalArtist: r.originalArtist,
          isMedley: r.isMedley,
          excludedReason: r.excludedReason,
        };
        // Upsert keeps any Deezer match from an earlier run.
        await tx
          .insert(songs)
          .values({ artistMbid: artist.mbid, name: r.name, ...values })
          .onConflictDoUpdate({ target: [songs.artistMbid, songs.name], set: values });
      }
      await tx.delete(songs).where(
        and(
          eq(songs.artistMbid, artist.mbid),
          notInArray(
            songs.name,
            rows.map((r) => r.name),
          ),
        ),
      );
    });

    const summary = summarise(artist, opts.source, counts.totalSetlists, rows, false, run.id);
    await db
      .update(ingestRuns)
      .set({
        finishedAt: now(),
        songsFound: summary.kept.length,
        notes: JSON.stringify({
          totalSetlists: counts.totalSetlists,
          excluded: summary.excluded.map((s) => ({ name: s.name, count: s.count, reason: s.excludedReason })),
        }),
      })
      .where(eq(ingestRuns.id, run.id));
    return summary;
  } catch (err) {
    await db
      .update(ingestRuns)
      .set({ finishedAt: now(), notes: JSON.stringify({ error: String(err) }) })
      .where(eq(ingestRuns.id, run.id));
    throw err;
  }
}

function summarise(
  artist: SetlistArtist,
  source: CountSource,
  totalSetlists: number,
  rows: PreparedSong[],
  cached: boolean,
  runId?: number,
): IngestSummary {
  const sorted = [...rows].sort((a, b) => b.count - a.count);
  return {
    artist,
    source,
    cached,
    totalSetlists,
    kept: sorted.filter((r) => !r.excludedReason),
    excluded: sorted.filter((r) => r.excludedReason),
    runId,
  };
}
