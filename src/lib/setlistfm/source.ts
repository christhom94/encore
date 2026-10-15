import { getSongCountsByAggregate } from "./aggregate";
import { getSongCountsByStats } from "./stats";
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
  return (artist) => getSongCountsByStats(artist, (msg) => progress?.(msg));
}
