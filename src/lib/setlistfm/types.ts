/** An artist as setlist.fm knows it. Always keyed by MusicBrainz ID, never by name. */
export interface SetlistArtist {
  mbid: string;
  name: string;
  disambiguation: string | null;
  /** e.g. https://www.setlist.fm/setlists/metallica-3bd680c8.html */
  url: string;
}

/** One song with its number of live performances, as returned by a count source. */
export interface SongCount {
  /** Name as it appears on setlist.fm, without any "(X cover)" suffix. */
  name: string;
  count: number;
  isCover: boolean;
  /** Original artist when the song is a cover. */
  originalArtist: string | null;
  /** Played over the PA rather than live (only the API reports this). */
  isTape?: boolean;
}

export interface SongCounts {
  songs: SongCount[];
  totalSetlists: number;
}

export type CountSource = "stats" | "aggregate";

/** Both sources implement this, selected by COUNT_SOURCE. */
export type GetSongCounts = (artist: SetlistArtist) => Promise<SongCounts>;
