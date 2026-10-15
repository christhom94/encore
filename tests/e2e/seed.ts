// Builds the e2e test database (DATABASE_URL, default file:./e2e.db) with no
// network: Metallica's real counts from the saved stats page fixture, the
// prototype's sample covers, and small test-only artists for the edge cases.
// Run by the Playwright web server before `next start`.

import { readFileSync, rmSync } from "node:fs";
import { eq } from "drizzle-orm";
import { createDb, migrateDb } from "../../src/db/client";
import { albums, artists, ingestJobs, songs } from "../../src/db/schema";
import { SAMPLE_ARTIST, SAMPLE_DECK } from "../../src/data/sample-deck";
import { ingestCounts } from "../../src/ingest/ingest";
import { parseStatsPage } from "../../src/lib/setlistfm/stats";

export const E2E = {
  metallica: SAMPLE_ARTIST.id,
  oasis: "39ab1aed-75e0-4140-bd47-540276886b60",
  pearlJam: "83b9cbe7-9857-49e2-ab8e-b57b01038103",
  tooFew: "00000000-0000-4000-8000-000000000003",
  failed: "00000000-0000-4000-8000-000000000004",
};

async function main() {
  const url = process.env.DATABASE_URL ?? "file:./e2e.db";
  if (url.startsWith("file:")) rmSync(url.slice(5), { force: true });
  const db = createDb(url);
  await migrateDb(db);

  // Metallica: real counts parsed from the fixture.
  const counts = parseStatsPage(readFileSync("tests/fixtures/metallica-stats.html", "utf8"));
  await ingestCounts(
    db,
    {
      mbid: E2E.metallica,
      name: "Metallica",
      disambiguation: null,
      url: "https://www.setlist.fm/setlists/metallica-3bd680c8.html",
    },
    { source: "stats", getSongCounts: async () => counts },
  );
  await db
    .update(artists)
    .set({ pictureUrl: "/sample/metallica-band.jpg" })
    .where(eq(artists.mbid, E2E.metallica));

  // The prototype's covers and accents for the sample songs.
  const sampleAlbums = new Map<string, number>();
  let albumId = 1000;
  for (const card of SAMPLE_DECK) {
    await db.update(songs).set({ deezerTrackId: card.trackId }).where(eq(songs.displayName, card.title));
    if (!card.cover) continue;
    if (!sampleAlbums.has(card.album)) {
      sampleAlbums.set(card.album, ++albumId);
      await db.insert(albums).values({
        deezerAlbumId: albumId,
        title: card.album,
        year: card.year,
        coverUrl: card.cover,
        accent: card.accent,
      });
    }
    await db
      .update(songs)
      .set({ deezerAlbumId: sampleAlbums.get(card.album) })
      .where(eq(songs.displayName, card.title));
  }

  // Test-only artists (made-up counts) so the home tiles and edge cases have data.
  const fake = async (mbid: string, name: string, totalSetlists: number, n: number, photo: string | null) => {
    await db.insert(artists).values({
      mbid,
      name,
      setlistfmUrl: `https://www.setlist.fm/setlists/test-${mbid}.html`,
      statsUrl: `https://www.setlist.fm/stats/test-${mbid}.html`,
      totalSetlists,
      pictureUrl: photo,
      countsUpdatedAt: new Date(),
    });
    for (let i = 0; i < n; i++) {
      await db.insert(songs).values({
        artistMbid: mbid,
        name: `${name} test song ${i + 1}`,
        displayName: `${name} test song ${i + 1}`,
        count: 1500 - i * 20,
        rank: i + 1,
      });
    }
  };
  await fake(E2E.oasis, "Oasis", 900, 12, "/sample/oasis.jpg");
  await fake(E2E.pearlJam, "Pearl Jam", 800, 12, "/sample/pearl-jam.jpg");
  await fake(E2E.tooFew, "Tiny Band", 40, 3, null);
  await db.insert(ingestJobs).values({
    artistMbid: E2E.failed,
    artistName: "Silent Band",
    status: "failed",
    errorCode: "no_setlists",
    error: "No setlists with songs for Silent Band on setlist.fm yet.",
    requestedAt: new Date(),
    finishedAt: new Date(),
  });

  console.log(`Seeded ${url}`);
}

if (process.argv[1]?.endsWith("seed.ts")) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
