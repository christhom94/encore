export type Direction = "higher" | "lower";

export type Screen = "home" | "play" | "reveal" | "over";

/** One song in a deck, as the game needs it. */
export interface Card {
  id: string;
  title: string;
  album: string;
  year: number | null;
  /** Times played live (setlist.fm). */
  count: number;
  /** The number shown to the player. */
  line: number;
  /** All-time rank by play count for this artist (1 = most played). */
  rank: number;
  /** Cover image URL, or null for the halftone placeholder. */
  cover: string | null;
  /** Album accent colour (hex) or null for the default red. */
  accent: string | null;
}

export interface Artist {
  id: string;
  name: string;
  totalSetlists: number;
  photo: string | null;
}

export interface Guess {
  /** Index of the card in the deck. */
  i: number;
  dir: Direction;
  ok: boolean;
}

export interface LastResult {
  ok: boolean;
  truth: Direction;
  dir: Direction;
}
