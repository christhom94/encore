import { balancedAnswers, makeLine } from "./line";
import type { Rng } from "./random";
import type { Card } from "./types";

// Deck rules (CLAUDE.md): songs with at least MIN_PLAYS performances,
// shuffled, weighted towards the most played so songs are recognisable.

export type DeckSong = Omit<Card, "line">;

export interface DeckOptions {
  minPlays: number;
  rng: Rng;
  /** Songs ranked this high or better get extra weight. */
  topN?: number;
  /** How much more likely a top song is to come early. */
  topWeight?: number;
  /** Cap the deck length (the daily encore uses 10). Default: every eligible song. */
  size?: number;
}

export const MIN_DECK = 10;

/**
 * Weighted shuffle (Efraimidis–Spirakis): each song draws key = u^(1/w), and
 * the deck is the songs by descending key. Top songs (w > 1) tend to come
 * first, but any song can appear anywhere.
 */
export function weightedOrder<T extends { rank: number }>(
  songs: T[],
  rng: Rng,
  topN = 60,
  topWeight = 4,
): T[] {
  return songs
    .map((s) => ({ s, key: rng() ** (1 / (s.rank <= topN ? topWeight : 1)) }))
    .sort((a, b) => b.key - a.key)
    .map((x) => x.s);
}

export function buildDeck(songs: DeckSong[], opts: DeckOptions): Card[] {
  const eligible = songs.filter((s) => s.count >= opts.minPlays);
  const ordered = weightedOrder(eligible, opts.rng, opts.topN, opts.topWeight).slice(
    0,
    opts.size ?? Infinity,
  );
  const answers = balancedAnswers(ordered.length, opts.rng);
  return ordered.map((s, i) => ({ ...s, line: makeLine(s.count, answers[i], opts.rng).line }));
}
