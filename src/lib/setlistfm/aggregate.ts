import { getSetlistPage, type ApiSetlist } from "./api";
import type { SetlistArtist, SongCount, SongCounts } from "./types";

// Fallback count source (COUNT_SOURCE=aggregate): sum song entries across
// every setlist via the API. Tapes are counted separately and flagged so the
// filters exclude them. Counts can differ slightly from the stats page.

export function tallySetlists(setlists: ApiSetlist[]): SongCounts {
  const byName = new Map<string, SongCount>();
  let total = 0;
  for (const setlist of setlists) {
    const songs = setlist.sets?.set?.flatMap((s) => s.song ?? []) ?? [];
    if (songs.length === 0) continue; // empty setlists are not counted as shows
    total++;
    for (const song of songs) {
      const name = song.name?.trim();
      if (!name) continue;
      const key = `${song.tape ? "tape:" : ""}${name}`;
      const entry = byName.get(key) ?? {
        name,
        count: 0,
        isCover: !!song.cover,
        originalArtist: song.cover?.name ?? null,
        isTape: !!song.tape,
      };
      entry.count++;
      byName.set(key, entry);
    }
  }
  return { songs: [...byName.values()].sort((a, b) => b.count - a.count), totalSetlists: total };
}

export async function getSongCountsByAggregate(
  artist: SetlistArtist,
  onProgress?: (page: number, pages: number) => void,
): Promise<SongCounts> {
  const setlists: ApiSetlist[] = [];
  const first = await getSetlistPage(artist.mbid, 1);
  if (!first) return { songs: [], totalSetlists: 0 };
  const pages = Math.ceil(first.total / first.itemsPerPage);
  setlists.push(...(first.setlist ?? []));
  for (let p = 2; p <= pages; p++) {
    onProgress?.(p, pages);
    const page = await getSetlistPage(artist.mbid, p);
    setlists.push(...(page?.setlist ?? []));
  }
  return tallySetlists(setlists);
}
