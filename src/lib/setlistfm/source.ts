import { getSongCountsByAggregate } from "./aggregate";
import { getSongCountsByStats, StatsBlockedError } from "./stats";
import type { CountSource, GetSongCounts } from "./types";

/** COUNT_SOURCE (or an override): "stats" (default, the client's choice) or "aggregate". */
export function countSource(override?: string): CountSource {
  const value = (override ?? process.env.COUNT_SOURCE ?? "stats").trim();
  if (value !== "stats" && value !== "aggregate") throw new Error(`Unknown count source "${value}".`);
  return value;
}

/** getSongCounts(artist) for the chosen source. */
export function songCountsFor(source: CountSource, progress?: (msg: string) => void): GetSongCounts {
  if (source === "aggregate")
    return (artist) => getSongCountsByAggregate(artist, (p, n) => progress?.(`Setlists page ${p} of ${n}`));
  return async (artist) => {
    try {
      const counts = await getSongCountsByStats(artist, (msg) => progress?.(msg));
      if (counts.songs.length) return counts;
      progress?.(`No stats page for ${artist.name}; summing setlists via the API instead.\n`);
    } catch (err) {
      if (!(err instanceof StatsBlockedError)) throw err;
      progress?.(
        `The stats page is blocked by setlist.fm's bot protection; summing setlists via the API instead.\n`,
      );
    }
    return getSongCountsByAggregate(artist, (p, n) => progress?.(`Setlists page ${p} of ${n}`));
  };
}
