CREATE TABLE `ingest_jobs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`artist_mbid` text NOT NULL,
	`artist_name` text NOT NULL,
	`status` text DEFAULT 'queued' NOT NULL,
	`error_code` text,
	`error` text,
	`requested_at` integer NOT NULL,
	`started_at` integer,
	`finished_at` integer
);
--> statement-breakpoint
CREATE INDEX `ingest_jobs_status` ON `ingest_jobs` (`status`,`requested_at`);--> statement-breakpoint
CREATE INDEX `ingest_jobs_artist` ON `ingest_jobs` (`artist_mbid`);