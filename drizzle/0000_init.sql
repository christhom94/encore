CREATE TABLE `albums` (
	`deezer_album_id` integer PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`year` integer,
	`cover_url` text,
	`accent` text
);
--> statement-breakpoint
CREATE TABLE `artists` (
	`mbid` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`disambiguation` text,
	`setlistfm_url` text NOT NULL,
	`stats_url` text NOT NULL,
	`total_setlists` integer,
	`deezer_artist_id` integer,
	`picture_url` text,
	`counts_updated_at` integer
);
--> statement-breakpoint
CREATE TABLE `ingest_runs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`artist_mbid` text NOT NULL,
	`source` text NOT NULL,
	`started_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`finished_at` integer,
	`songs_found` integer,
	`songs_matched` integer,
	`notes` text
);
--> statement-breakpoint
CREATE TABLE `songs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`artist_mbid` text NOT NULL,
	`name` text NOT NULL,
	`display_name` text NOT NULL,
	`count` integer NOT NULL,
	`rank` integer,
	`is_cover` integer DEFAULT false NOT NULL,
	`original_artist` text,
	`is_medley` integer DEFAULT false NOT NULL,
	`deezer_track_id` integer,
	`deezer_album_id` integer,
	`excluded_reason` text,
	FOREIGN KEY (`artist_mbid`) REFERENCES `artists`(`mbid`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`deezer_album_id`) REFERENCES `albums`(`deezer_album_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `songs_artist_name` ON `songs` (`artist_mbid`,`name`);--> statement-breakpoint
CREATE INDEX `songs_artist_rank` ON `songs` (`artist_mbid`,`rank`);