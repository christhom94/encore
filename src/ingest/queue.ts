import { and, asc, eq, inArray, lt } from "drizzle-orm";
import type { Db } from "@/db/client";
import { artists, ingestJobs, type IngestJob } from "@/db/schema";
import { getArtist } from "@/lib/setlistfm/api";
import { getSongCountsByAggregate } from "@/lib/setlistfm/aggregate";
import { getSongCountsByStats, StatsBlockedError } from "@/lib/setlistfm/stats";
import type { CountSource, SongCounts } from "@/lib/setlistfm/types";
import { countSource } from "@/lib/setlistfm/source";
import { ingestDeezer } from "./deezer";
import { ingestCounts } from "./ingest";

// The ingest queue. Requests only ever add a job; the worker does the
// fetching, one job at a time, politely (docs/DATA.md).

export type JobState = "queued" | "running" | "done" | "failed";
export type FailReason = "no_artist" | "no_setlists" | "error";

/** Add a job for this artist unless one is already waiting or running. */
export async function enqueueIngest(db: Db, artist: { mbid: string; name: string }, now = new Date()) {
  const active = await db.query.ingestJobs.findFirst({
    where: and(eq(ingestJobs.artistMbid, artist.mbid), inArray(ingestJobs.status, ["queued", "running"])),
  });
  if (active) return active;
  const [job] = await db
    .insert(ingestJobs)
    .values({ artistMbid: artist.mbid, artistName: artist.name, status: "queued", requestedAt: now })
    .returning();
  return job;
}

export async function latestJob(db: Db, mbid: string): Promise<IngestJob | undefined> {
  const rows = await db
    .select()
    .from(ingestJobs)
    .where(eq(ingestJobs.artistMbid, mbid))
    .orderBy(asc(ingestJobs.id));
  return rows.at(-1);
}

/** How many jobs are ahead of this one (0 = next or running). */
export async function queuePosition(db: Db, job: IngestJob): Promise<number> {
  if (job.status !== "queued") return 0;
  const ahead = await db
    .select({ id: ingestJobs.id })
    .from(ingestJobs)
    .where(and(eq(ingestJobs.status, "queued"), lt(ingestJobs.id, job.id)));
  return ahead.length;
}

/** Take the oldest queued job and mark it running. */
export async function claimNext(db: Db, now = new Date()): Promise<IngestJob | null> {
  const next = await db.query.ingestJobs.findFirst({
    where: eq(ingestJobs.status, "queued"),
    orderBy: asc(ingestJobs.id),
  });
  if (!next) return null;
  const [claimed] = await db
    .update(ingestJobs)
    .set({ status: "running", startedAt: now })
    .where(and(eq(ingestJobs.id, next.id), eq(ingestJobs.status, "queued")))
    .returning();
  return claimed ?? null;
}

/** Jobs left "running" by a crash or restart go back in the queue. */
export async function requeueStale(db: Db, olderThanMs = 15 * 60 * 1000, now = new Date()) {
  await db
    .update(ingestJobs)
    .set({ status: "queued", startedAt: null })
    .where(
      and(eq(ingestJobs.status, "running"), lt(ingestJobs.startedAt, new Date(now.getTime() - olderThanMs))),
    );
}

/**
 * Counts from the configured source. Falls back to summing setlists via the
 * API (docs/DATA.md) when the stats page is missing or setlist.fm's bot
 * protection refuses it.
 */
async function fetchCounts(
  artist: Parameters<typeof getSongCountsByStats>[0],
  log: (msg: string) => void,
): Promise<{ counts: SongCounts; source: CountSource }> {
  if (countSource() === "stats") {
    try {
      const counts = await getSongCountsByStats(artist);
      if (counts.songs.length) return { counts, source: "stats" };
      log(`no stats page for ${artist.name}, using the API`);
    } catch (err) {
      if (!(err instanceof StatsBlockedError)) throw err;
      log(`stats page blocked by bot protection, using the API`);
    }
  }
  return {
    counts: await getSongCountsByAggregate(
      artist,
      (p, n) => p % 20 === 0 && log(`setlists page ${p} of ${n}`),
    ),
    source: "aggregate",
  };
}

/** Run one job: counts, then Deezer covers and previews. Never throws. */
export async function runJob(db: Db, job: IngestJob, log: (msg: string) => void = () => undefined) {
  const finish = (status: JobState, errorCode?: FailReason, error?: string) =>
    db
      .update(ingestJobs)
      .set({ status, errorCode: errorCode ?? null, error: error ?? null, finishedAt: new Date() })
      .where(eq(ingestJobs.id, job.id));

  try {
    const existing = await db.query.artists.findFirst({ where: eq(artists.mbid, job.artistMbid) });
    const artist = existing
      ? {
          mbid: existing.mbid,
          name: existing.name,
          disambiguation: existing.disambiguation,
          url: existing.setlistfmUrl,
        }
      : await getArtist(job.artistMbid);
    if (!artist) return await finish("failed", "no_artist", "setlist.fm does not know this artist.");

    log(`ingest ${artist.name}: counts`);
    const { counts, source } = await fetchCounts(artist, (m) => log(`ingest ${artist.name}: ${m}`));
    if (counts.songs.length === 0 || counts.totalSetlists === 0)
      return await finish(
        "failed",
        "no_setlists",
        `No setlists with songs for ${artist.name} on setlist.fm yet.`,
      );

    const summary = await ingestCounts(db, artist, {
      source,
      getSongCounts: async () => counts,
      force: true,
    });
    log(`ingest ${artist.name}: ${summary.kept.length} songs, matching on Deezer`);
    await ingestDeezer(db, artist.mbid, { runId: summary.runId });
    await finish("done");
    log(`ingest ${artist.name}: done`);
  } catch (err) {
    await finish("failed", "error", err instanceof Error ? err.message : String(err));
    log(`ingest ${job.artistName} failed: ${err}`);
  }
}
