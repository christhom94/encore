import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { createDb, migrateDb, type Db } from "@/db/client";
import { artists, ingestRuns, songs } from "@/db/schema";
import { ingestCounts } from "@/ingest/ingest";
import type { SongCounts } from "@/lib/setlistfm/types";

const artist = {
  mbid: "65f4f0c5-ef9e-490c-aee3-909e7ae6b2ab",
  name: "Metallica",
  disambiguation: null,
  url: "https://www.setlist.fm/setlists/metallica-3bd680c8.html",
};

const counts: SongCounts = {
  totalSetlists: 2198,
  songs: [
    { name: "Master of Puppets", count: 1803, isCover: false, originalArtist: null },
    { name: "Creeping Death", count: 1683, isCover: false, originalArtist: null },
    { name: "Am I Evil? (Diamond Head cover)", count: 500, isCover: true, originalArtist: null },
    { name: "Drum Solo", count: 300, isCover: false, originalArtist: null },
  ],
};

let db: Db;
let calls = 0;
const getSongCounts = async () => {
  calls++;
  return counts;
};

beforeEach(async () => {
  db = createDb(":memory:");
  await migrateDb(db);
  calls = 0;
});

describe("ingestCounts", () => {
  it("stores the artist, songs and an ingest run", async () => {
    const summary = await ingestCounts(db, artist, { source: "stats", getSongCounts });
    expect(summary.kept.map((s) => s.displayName)).toEqual([
      "Master of Puppets",
      "Creeping Death",
      "Am I Evil?",
    ]);
    expect(summary.excluded.map((s) => s.displayName)).toEqual(["Drum Solo"]);

    const a = await db.query.artists.findFirst({ where: eq(artists.mbid, artist.mbid) });
    expect(a).toMatchObject({
      totalSetlists: 2198,
      statsUrl: "https://www.setlist.fm/stats/metallica-3bd680c8.html",
    });

    const rows = await db.select().from(songs).where(eq(songs.artistMbid, artist.mbid));
    expect(rows).toHaveLength(4);
    expect(rows.find((r) => r.displayName === "Am I Evil?")).toMatchObject({
      isCover: true,
      originalArtist: "Diamond Head",
      rank: 3,
    });

    const [run] = await db.select().from(ingestRuns);
    expect(run).toMatchObject({ source: "stats", songsFound: 3 });
    expect(JSON.parse(run.notes ?? "{}").excluded).toEqual([
      { name: "Drum Solo", count: 300, reason: "solo" },
    ]);
  });

  it("skips fetching when counts are under 7 days old, unless forced", async () => {
    await ingestCounts(db, artist, { source: "stats", getSongCounts });
    const again = await ingestCounts(db, artist, { source: "stats", getSongCounts });
    expect(again.cached).toBe(true);
    expect(again.kept).toHaveLength(3);
    expect(calls).toBe(1);
    await ingestCounts(db, artist, { source: "stats", getSongCounts, force: true });
    expect(calls).toBe(2);
  });

  it("updates counts in place and keeps Deezer matches", async () => {
    await ingestCounts(db, artist, { source: "stats", getSongCounts });
    await db.update(songs).set({ deezerTrackId: 42 }).where(eq(songs.name, "Master of Puppets"));
    counts.songs[0].count = 1810;
    await ingestCounts(db, artist, { source: "stats", getSongCounts, force: true });
    const mop = await db.query.songs.findFirst({ where: eq(songs.name, "Master of Puppets") });
    expect(mop).toMatchObject({ count: 1810, deezerTrackId: 42 });
  });
});
