import { excludedReason, isMedley, splitCover, type ExcludedReason } from "@/lib/setlistfm/filters";
import type { SongCounts } from "@/lib/setlistfm/types";

export interface PreparedSong {
  name: string;
  displayName: string;
  count: number;
  rank: number | null;
  isCover: boolean;
  originalArtist: string | null;
  isMedley: boolean;
  excludedReason: ExcludedReason | null;
}

/**
 * Turn raw counts into rows: strip any "(X cover)" suffix for display, flag
 * medleys, exclude non-songs and rank the rest by count (ties share a rank).
 */
export function prepareSongs({ songs }: SongCounts): PreparedSong[] {
  const merged = new Map<string, PreparedSong>();
  for (const s of songs) {
    const split = splitCover(s.name);
    const name = split.name;
    const originalArtist = s.originalArtist ?? split.originalArtist;
    const reason = excludedReason({ name, isTape: s.isTape });
    const key = `${reason === "tape" ? "tape:" : ""}${name.toLowerCase()}`;
    const prev = merged.get(key);
    if (prev) {
      // Same title listed twice (e.g. as a cover and not): keep the larger count.
      if (s.count > prev.count) prev.count = s.count;
      continue;
    }
    merged.set(key, {
      name: reason === "tape" ? `${name} (tape)` : name,
      displayName: name,
      count: s.count,
      rank: null,
      isCover: s.isCover || !!originalArtist,
      originalArtist,
      isMedley: isMedley(name),
      excludedReason: reason,
    });
  }

  const rows = [...merged.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  let rank = 0,
    seen = 0,
    lastCount = -1;
  for (const row of rows) {
    if (row.excludedReason) continue;
    seen++;
    if (row.count !== lastCount) rank = seen;
    row.rank = rank;
    lastCount = row.count;
  }
  return rows;
}
