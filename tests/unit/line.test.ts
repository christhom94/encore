import { describe, expect, it } from "vitest";
import { buildDeck, weightedOrder, type DeckSong } from "@/game/deck";
import { balancedAnswers, makeLine, stepFor } from "@/game/line";
import { seededRng } from "@/game/random";
import { truthFor } from "@/game/reducer";

describe("stepFor", () => {
  it("rounds to 50 from 500 plays, 10 from 50, else 5", () => {
    expect([1803, 500, 499, 50, 49, 10, 1].map(stepFor)).toEqual([50, 50, 10, 10, 5, 5, 5]);
  });
});

describe("makeLine", () => {
  const counts = [
    1, 2, 3, 5, 9, 10, 11, 14, 17, 25, 49, 50, 51, 99, 333, 499, 500, 501, 873, 1646, 1803, 9999,
  ];

  it("never equals the count, never drops below 1, and lands on the rounding step", () => {
    const rng = seededRng(1);
    for (const count of counts) {
      for (const want of ["higher", "lower"] as const) {
        for (let i = 0; i < 200; i++) {
          const { line, answer } = makeLine(count, want, rng);
          expect(line, `count ${count}`).not.toBe(count);
          expect(line).toBeGreaterThanOrEqual(1);
          expect(answer).toBe(truthFor({ count, line }));
          // Rounded unless a tiny count forced the nearest possible value.
          if (count >= 20) expect(line % stepFor(count)).toBe(0);
        }
      }
    }
  });

  it("gives the requested answer whenever it is possible", () => {
    const rng = seededRng(2);
    for (const count of counts.filter((c) => c > 1)) {
      expect(makeLine(count, "higher", rng).answer).toBe("higher");
      expect(makeLine(count, "lower", rng).answer).toBe("lower");
    }
    // A song played once cannot have a line below it.
    expect(makeLine(1, "higher", rng).answer).toBe("lower");
  });

  it("keeps the factor within the documented bands for large counts", () => {
    const rng = seededRng(3);
    for (let i = 0; i < 500; i++) {
      const hi = makeLine(1803, "higher", rng).line / 1803;
      const lo = makeLine(1803, "lower", rng).line / 1803;
      expect(hi).toBeGreaterThanOrEqual(0.58);
      expect(hi).toBeLessThanOrEqual(0.87);
      expect(lo).toBeGreaterThanOrEqual(1.13);
      expect(lo).toBeLessThanOrEqual(1.42);
    }
  });
});

describe("balancedAnswers", () => {
  it("is half higher, half lower", () => {
    const rng = seededRng(4);
    for (const n of [1, 2, 10, 11, 113]) {
      const a = balancedAnswers(n, rng);
      const highs = a.filter((x) => x === "higher").length;
      expect(Math.abs(highs - (n - highs))).toBeLessThanOrEqual(1);
    }
  });
});

const songs: DeckSong[] = Array.from({ length: 120 }, (_, i) => ({
  id: String(i + 1),
  title: `Song ${i + 1}`,
  album: "Album",
  year: 1990,
  count: 2000 - i * 16, // rank 1 = 2000 plays … rank 120 = 96 plays
  rank: i + 1,
  cover: null,
  accent: null,
  trackId: null,
}));

describe("buildDeck", () => {
  it("only uses songs with at least MIN_PLAYS and is reproducible with a seed", () => {
    const a = buildDeck(songs, { minPlays: 500, rng: seededRng(7) });
    const b = buildDeck(songs, { minPlays: 500, rng: seededRng(7) });
    expect(a).toEqual(b);
    expect(a.every((c) => c.count >= 500)).toBe(true);
    expect(a).toHaveLength(songs.filter((s) => s.count >= 500).length);
  });

  it("is roughly half higher and half lower", () => {
    const deck = buildDeck(songs, { minPlays: 10, rng: seededRng(8) });
    const highs = deck.filter((c) => truthFor(c) === "higher").length;
    expect(Math.abs(highs - (deck.length - highs))).toBeLessThanOrEqual(1);
  });

  it("caps the size when asked", () => {
    expect(buildDeck(songs, { minPlays: 10, rng: seededRng(9), size: 10 })).toHaveLength(10);
  });
});

describe("weightedOrder", () => {
  it("brings the 60 most played forward", () => {
    const rng = seededRng(10);
    let topInFirstTen = 0;
    const runs = 400;
    for (let r = 0; r < runs; r++) {
      topInFirstTen += weightedOrder(songs, rng)
        .slice(0, 10)
        .filter((s) => s.rank <= 60).length;
    }
    // Unweighted would average 5 of 10 (60 of 120 songs); weighting should push it well above.
    expect(topInFirstTen / runs).toBeGreaterThan(7); // about 7.9 with the default weight of 4
  });
});
