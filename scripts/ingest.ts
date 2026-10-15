// Ingest play counts for one artist:
//   npm run ingest -- "Metallica"
//   npm run ingest -- --mbid 65f4f0c5-ef9e-490c-aee3-909e7ae6b2ab
// Options: --force (ignore the 7-day cache and re-match Deezer), --source stats|aggregate,
//          --skip-deezer (counts only)

import "./env";
import { parseArgs } from "node:util";
import { getDb, migrateDb } from "@/db/client";
import { ingestDeezer, MIN_PLAYS, type DeezerSummary } from "@/ingest/deezer";
import { ingestCounts, type IngestSummary } from "@/ingest/ingest";
import { getArtist, pickArtist, searchArtists } from "@/lib/setlistfm/api";
import { countSource, songCountsFor } from "@/lib/setlistfm/source";
import type { SetlistArtist } from "@/lib/setlistfm/types";

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    mbid: { type: "string" },
    force: { type: "boolean", default: false },
    source: { type: "string" },
    "skip-deezer": { type: "boolean", default: false },
  },
});

const fmt = (n: number) => n.toLocaleString("en-GB");
const label = (a: SetlistArtist) => `${a.name}${a.disambiguation ? ` (${a.disambiguation})` : ""}`;

async function resolveArtist(): Promise<SetlistArtist> {
  if (values.mbid) {
    const a = await getArtist(values.mbid);
    if (!a) throw new Error(`No setlist.fm artist with mbid ${values.mbid}.`);
    return a;
  }
  const query = positionals.join(" ").trim();
  if (!query) throw new Error('Usage: npm run ingest -- "Artist name" [--force] [--source stats|aggregate]');
  const results = await searchArtists(query);
  const artist = pickArtist(results, query);
  if (!artist) throw new Error(`No setlist.fm artist found for "${query}".`);
  const others = results.filter((r) => r.mbid !== artist.mbid).slice(0, 4);
  if (others.length) {
    console.log(`Other matches (use --mbid to pick one):`);
    for (const o of others) console.log(`  ${o.mbid}  ${label(o)}`);
  }
  return artist;
}

function print(s: IngestSummary) {
  console.log(`\n${label(s.artist)}  [${s.artist.mbid}]`);
  console.log(
    s.cached
      ? `Counts are less than 7 days old, nothing fetched (use --force to refresh).`
      : `Source: ${s.source}${s.runId ? `  (ingest run #${s.runId})` : ""}`,
  );
  console.log(`Total setlists: ${fmt(s.totalSetlists)}`);
  console.log(
    `Songs stored:   ${fmt(s.kept.length)} (${s.kept.filter((r) => r.count >= 10).length} with 10+ plays)`,
  );
  console.log(
    `Covers:         ${s.kept.filter((r) => r.isCover).length}   Medleys: ${s.kept.filter((r) => r.isMedley).length}`,
  );
  console.log(`\nTop 10:`);
  for (const r of s.kept.slice(0, 10)) {
    console.log(
      `  #${String(r.rank).padEnd(3)} ${fmt(r.count).padStart(6)}  ${r.displayName}${r.isCover ? ` (${r.originalArtist ?? "?"} cover)` : ""}`,
    );
  }
  console.log(`\nExcluded (${s.excluded.length}), please review:`);
  for (const r of s.excluded) console.log(`  ${fmt(r.count).padStart(6)}  ${r.name}  [${r.excludedReason}]`);
}

async function main() {
  const source = countSource(values.source);
  await migrateDb();
  const artist = await resolveArtist();
  console.log(
    `Ingesting ${label(artist)} from ${source === "stats" ? "the setlist.fm stats page" : "the setlist.fm API"}…`,
  );
  const summary = await ingestCounts(getDb(), artist, {
    source,
    force: values.force,
    getSongCounts: songCountsFor(source, (msg) => process.stdout.write(`\r${msg}   `)),
  });
  print(summary);

  if (values["skip-deezer"]) return;
  console.log(`\nMatching songs on Deezer…`);
  const dz = await ingestDeezer(getDb(), artist.mbid, {
    force: values.force,
    runId: summary.runId,
    progress: (msg) => process.stdout.write(`\r${msg}   `),
  });
  printDeezer(dz);
}

function printDeezer(d: DeezerSummary) {
  if (!d.deezerArtist) {
    console.log(`\nNo matching artist on Deezer: songs keep the placeholder cover and default colour.`);
    return;
  }
  console.log(`\nDeezer artist: ${d.deezerArtist.name} [${d.deezerArtist.id}]`);
  console.log(`Matched ${d.matched} of ${d.considered} songs checked; ${d.albumsAdded} new albums.`);
  for (const a of d.accents) console.log(`  ${(a.accent ?? "default").padEnd(8)} ${a.album}`);
  console.log(
    `\nUnmatched with ${MIN_PLAYS()}+ plays (${d.unmatched.length}): placeholder cover, default colour`,
  );
  for (const u of d.unmatched) console.log(`  ${fmt(u.count).padStart(6)}  ${u.name}`);
  if (d.unmatchedRare) console.log(`  …plus ${d.unmatchedRare} songs with fewer than ${MIN_PLAYS()} plays.`);
}

main().catch((err) => {
  console.error(`\n${err instanceof Error ? err.message : err}`);
  process.exit(1);
});
