// Best streak per artist, in localStorage for now. Every access is guarded:
// storage can throw in private windows or when site data is blocked.

const key = (artistId: string) => `encore.best.${artistId}`;

export function readBest(artistId: string): number {
  try {
    return Number(localStorage.getItem(key(artistId))) || 0;
  } catch {
    return 0;
  }
}

export function writeBest(artistId: string, best: number): void {
  try {
    localStorage.setItem(key(artistId), String(best));
  } catch {
    // Ignore: best streak is a convenience.
  }
}
