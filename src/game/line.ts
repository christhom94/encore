import type { Direction } from "./types";
import type { Rng } from "./random";

// "The line": the number shown on each card (CLAUDE.md, Game rules).
// line = count × factor, factor in [0.60, 0.85] (answer: higher) or
// [1.15, 1.40] (answer: lower), rounded to a friendly number. Never equal to
// the real count, never below 1.

/** Rounding step: nearest 50 from 500 plays, nearest 10 from 50, else nearest 5. */
export const stepFor = (count: number) => (count >= 500 ? 50 : count >= 50 ? 10 : 5);

export interface Line {
  line: number;
  /** The correct guess: "higher" when count > line. */
  answer: Direction;
}

/**
 * A line for this count whose correct answer is `want`. Falls back to the
 * other answer only when `want` is impossible (a song played once cannot have
 * a line below its count).
 */
export function makeLine(count: number, want: Direction, rng: Rng): Line {
  const step = stepFor(count);
  const factor = want === "higher" ? 0.6 + rng() * 0.25 : 1.15 + rng() * 0.25;
  let line = Math.round((count * factor) / step) * step;

  if (want === "higher") {
    // Need 1 <= line < count.
    if (line >= count) line = Math.floor((count - 1) / step) * step;
    if (line < 1) line = count - 1;
    if (line < 1) return makeLine(count, "lower", rng);
  } else {
    // Need line > count (equal would make "lower" right by the letter of the rule, but feels like a trick).
    if (line <= count) line = (Math.floor(count / step) + 1) * step;
  }
  return { line, answer: count > line ? "higher" : "lower" };
}

/** Balanced answers for n cards: half higher, half lower, in random order. */
export function balancedAnswers(n: number, rng: Rng): Direction[] {
  const firstHigher = rng() < 0.5;
  const answers = Array.from({ length: n }, (_, i): Direction =>
    (i % 2 === 0) === firstHigher ? "higher" : "lower",
  );
  for (let i = answers.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [answers[i], answers[j]] = [answers[j], answers[i]];
  }
  return answers;
}
