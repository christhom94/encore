import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

// Schema from docs/DATA.md section 6. Timestamps are stored as unix milliseconds.

export const artists = sqliteTable("artists", {
  mbid: text("mbid").primaryKey(),
  name: text("name").notNull(),
  disambiguation: text("disambiguation"),
  setlistfmUrl: text("setlistfm_url").notNull(),
  statsUrl: text("stats_url").notNull(),
  totalSetlists: integer("total_setlists"),
  deezerArtistId: integer("deezer_artist_id"),
  pictureUrl: text("picture_url"),
  countsUpdatedAt: integer("counts_updated_at", { mode: "timestamp_ms" }),
});

export const albums = sqliteTable("albums", {
  deezerAlbumId: integer("deezer_album_id").primaryKey(),
  title: text("title").notNull(),
  year: integer("year"),
  coverUrl: text("cover_url"),
  /** Hex accent from the cover, or null for the default red. */
  accent: text("accent"),
});

export const songs = sqliteTable(
  "songs",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    artistMbid: text("artist_mbid")
      .notNull()
      .references(() => artists.mbid, { onDelete: "cascade" }),
    /** Name as setlist.fm lists it (without the cover suffix). */
    name: text("name").notNull(),
    displayName: text("display_name").notNull(),
    count: integer("count").notNull(),
    /** Rank among kept songs by count (1 = most played); null when excluded. */
    rank: integer("rank"),
    isCover: integer("is_cover", { mode: "boolean" }).notNull().default(false),
    originalArtist: text("original_artist"),
    isMedley: integer("is_medley", { mode: "boolean" }).notNull().default(false),
    deezerTrackId: integer("deezer_track_id"),
    deezerAlbumId: integer("deezer_album_id").references(() => albums.deezerAlbumId),
    /** Why the entry is not a playable song (tape, intro, solo, jam); null when kept. */
    excludedReason: text("excluded_reason"),
  },
  (t) => [
    uniqueIndex("songs_artist_name").on(t.artistMbid, t.name),
    index("songs_artist_rank").on(t.artistMbid, t.rank),
  ],
);

export const ingestRuns = sqliteTable("ingest_runs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  artistMbid: text("artist_mbid").notNull(),
  source: text("source").notNull(),
  startedAt: integer("started_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
  finishedAt: integer("finished_at", { mode: "timestamp_ms" }),
  songsFound: integer("songs_found"),
  songsMatched: integer("songs_matched"),
  /** JSON: excluded entries, errors and other notes for review. */
  notes: text("notes"),
});

export type Artist = typeof artists.$inferSelect;
export type Song = typeof songs.$inferSelect;
export type NewSong = typeof songs.$inferInsert;

/**
 * Background ingest queue. A player searching for an artist we don't have yet
 * adds a job; the worker (src/ingest/worker.ts) runs it outside any request.
 */
export const ingestJobs = sqliteTable(
  "ingest_jobs",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    artistMbid: text("artist_mbid").notNull(),
    artistName: text("artist_name").notNull(),
    /** queued | running | done | failed */
    status: text("status").notNull().default("queued"),
    /** Machine-readable reason when failed: no_artist, no_setlists, too_few_songs, error */
    errorCode: text("error_code"),
    error: text("error"),
    /** What the worker is doing now, shown on the Tuning up screen. */
    progress: text("progress"),
    requestedAt: integer("requested_at", { mode: "timestamp_ms" }).notNull(),
    startedAt: integer("started_at", { mode: "timestamp_ms" }),
    finishedAt: integer("finished_at", { mode: "timestamp_ms" }),
  },
  (t) => [
    index("ingest_jobs_status").on(t.status, t.requestedAt),
    index("ingest_jobs_artist").on(t.artistMbid),
  ],
);

export type IngestJob = typeof ingestJobs.$inferSelect;
