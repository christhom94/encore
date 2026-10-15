import { beforeEach, describe, expect, it } from "vitest";
import { createDb, migrateDb, type Db } from "@/db/client";
import { artists, ingestJobs, songs } from "@/db/schema";
import { claimNext, enqueueIngest, queuePosition, requeueStale } from "@/ingest/queue";
import { truthFor } from "@/game/reducer";
import { getDeck } from "@/server/game";

let db: Db;
const A = { mbid: "00000000-0000-4000-8000-000000000001", name: "Band A" };
const B = { mbid: "00000000-0000-4000-8000-000000000002", name: "Band B" };

beforeEach(async () => {
  db = createDb(":memory:");
  await migrateDb(db);
});

async function addArtist(mbid: string, name: string, songCounts: number[]) {
  await db.insert(artists).values({
    mbid,
    name,
    setlistfmUrl: "https://www.setlist.fm/setlists/x.html",
    statsUrl: "https://www.setlist.fm/stats/x.html",
    totalSetlists: 500,
    countsUpdatedAt: new Date(),
  });
  for (const [i, count] of songCounts.entries()) {
    await db
      .insert(songs)
      .values({ artistMbid: mbid, name: `S${i}`, displayName: `Song ${i}`, count, rank: i + 1 });
  }
}

describe("ingest queue", () => {
  it("does not queue the same artist twice while a job is waiting", async () => {
    const first = await enqueueIngest(db, A);
    const again = await enqueueIngest(db, A);
    expect(again.id).toBe(first.id);
    expect(await db.select().from(ingestJobs)).toHaveLength(1);
  });

  it("hands out jobs oldest first and reports queue positions", async () => {
    const a = await enqueueIngest(db, A);
    const b = await enqueueIngest(db, B);
    expect(await queuePosition(db, b)).toBe(1);
    const claimed = await claimNext(db);
    expect(claimed?.id).toBe(a.id);
    expect(claimed?.status).toBe("running");
    expect(await queuePosition(db, b)).toBe(0);
    expect((await claimNext(db))?.id).toBe(b.id);
    expect(await claimNext(db)).toBeNull();
  });

  it("puts jobs stuck in running back in the queue", async () => {
    await enqueueIngest(db, A, new Date(0));
    await claimNext(db, new Date(1000));
    await requeueStale(db, 60_000, new Date(1000 + 120_000));
    expect((await claimNext(db))?.artistMbid).toBe(A.mbid);
  });
});

describe("getDeck", () => {
  it("is unknown for an artist we have never seen", async () => {
    expect((await getDeck(db, A.mbid)).status).toBe("unknown");
  });

  it("is pending while an ingest is queued or running", async () => {
    await enqueueIngest(db, A);
    expect(await getDeck(db, A.mbid)).toMatchObject({ status: "pending", job: "queued", position: 0 });
  });

  it("explains a failed ingest", async () => {
    await db.insert(ingestJobs).values({
      artistMbid: A.mbid,
      artistName: "Band A",
      status: "failed",
      errorCode: "no_setlists",
      error: "No setlists",
      requestedAt: new Date(),
    });
    expect(await getDeck(db, A.mbid)).toMatchObject({ status: "failed", reason: "no_setlists" });
  });

  it("needs at least 10 songs with MIN_PLAYS", async () => {
    await addArtist(A.mbid, "Band A", [500, 400, 300, 9, 8]);
    expect(await getDeck(db, A.mbid)).toMatchObject({
      status: "too_few",
      eligible: 3,
      needed: 10,
      minPlays: 10,
    });
  });

  it("deals every eligible song with lines, reproducibly by seed", async () => {
    await addArtist(B.mbid, "Band B", [900, 800, 700, 600, 500, 400, 300, 200, 100, 50, 20, 5]);
    const a = await getDeck(db, B.mbid, { seed: 1 });
    const b = await getDeck(db, B.mbid, { seed: 1 });
    expect(a).toEqual(b);
    if (a.status !== "ready") throw new Error("expected a deck");
    expect(a.deck).toHaveLength(11); // the 5-play song is below MIN_PLAYS
    expect(a.artist).toMatchObject({ name: "Band B", totalSetlists: 500 });
    for (const card of a.deck) expect(card.line).not.toBe(card.count);
    const highs = a.deck.filter((c) => truthFor(c) === "higher").length;
    expect(Math.abs(highs - (a.deck.length - highs))).toBeLessThanOrEqual(1);
  });
});
