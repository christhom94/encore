import { describe, expect, it } from "vitest";
import { canContinue, gameReducer, initialState, truthFor, type GameState } from "@/game/reducer";
import type { Card } from "@/game/types";

const card = (id: string, count: number, line: number): Card => ({
  id,
  title: id,
  album: "Album",
  year: 1990,
  count,
  line,
  rank: 1,
  cover: null,
  accent: null,
  trackId: null,
});

// Truths: a = higher, b = lower, c = higher.
const deck = [card("a", 1000, 800), card("b", 500, 600), card("c", 120, 100)];

const play = (best = 0) => gameReducer(initialState(deck, best), { type: "start" });
const run = (s: GameState, ...actions: Parameters<typeof gameReducer>[1][]) => actions.reduce(gameReducer, s);

describe("truthFor", () => {
  it("is higher only when count is strictly above the line", () => {
    expect(truthFor({ count: 10, line: 5 })).toBe("higher");
    expect(truthFor({ count: 5, line: 10 })).toBe("lower");
    expect(truthFor({ count: 5, line: 5 })).toBe("lower");
  });
});

describe("gameReducer", () => {
  it("starts a fresh run on the play screen", () => {
    const s = play();
    expect(s).toMatchObject({ screen: "play", i: 0, streak: 0, history: [], last: null, won: false });
  });

  it("scores a correct guess and moves to the reveal", () => {
    const s = gameReducer(play(), { type: "guess", dir: "higher" });
    expect(s.screen).toBe("reveal");
    expect(s.streak).toBe(1);
    expect(s.last).toEqual({ ok: true, truth: "higher", dir: "higher" });
    expect(s.history).toEqual([{ i: 0, dir: "higher", ok: true }]);
    expect(canContinue(s)).toBe(true);
  });

  it("scores an incorrect guess without adding to the streak", () => {
    const s = gameReducer(play(), { type: "guess", dir: "lower" });
    expect(s.streak).toBe(0);
    expect(s.last).toEqual({ ok: false, truth: "higher", dir: "lower" });
    expect(canContinue(s)).toBe(false);
  });

  it("advances to the next card after a correct guess", () => {
    const s = run(play(), { type: "guess", dir: "higher" }, { type: "advance" });
    expect(s).toMatchObject({ screen: "play", i: 1, streak: 1 });
  });

  it("builds the streak across cards", () => {
    const s = run(
      play(),
      { type: "guess", dir: "higher" },
      { type: "advance" },
      { type: "guess", dir: "lower" },
    );
    expect(s.streak).toBe(2);
    expect(s.history.map((h) => h.ok)).toEqual([true, true]);
  });

  it("ends the game after a wrong guess", () => {
    const s = run(
      play(),
      { type: "guess", dir: "higher" },
      { type: "advance" },
      { type: "guess", dir: "higher" },
      { type: "advance" },
    );
    expect(s).toMatchObject({ screen: "over", won: false, streak: 1 });
  });

  it("is a win when the whole deck is cleared", () => {
    const s = run(
      play(),
      { type: "guess", dir: "higher" },
      { type: "advance" },
      { type: "guess", dir: "lower" },
      { type: "advance" },
      { type: "guess", dir: "higher" },
    );
    expect(canContinue(s)).toBe(false);
    const over = gameReducer(s, { type: "advance" });
    expect(over).toMatchObject({ screen: "over", won: true, streak: 3 });
  });

  it("tracks the best streak and keeps a higher stored best", () => {
    let s = run(
      play(),
      { type: "guess", dir: "higher" },
      { type: "advance" },
      { type: "guess", dir: "lower" },
    );
    expect(s.best).toBe(2);
    s = run(s, { type: "advance" }, { type: "guess", dir: "lower" }, { type: "advance" }, { type: "start" });
    expect(s.best).toBe(2);
    expect(s.streak).toBe(0);
    expect(play(11).best).toBe(11);
    expect(gameReducer(play(), { type: "loadBest", best: 7 }).best).toBe(7);
  });

  it("ignores guesses outside the play screen", () => {
    const reveal = gameReducer(play(), { type: "guess", dir: "higher" });
    expect(gameReducer(reveal, { type: "guess", dir: "higher" })).toBe(reveal);
    const home = initialState(deck);
    expect(gameReducer(home, { type: "guess", dir: "higher" })).toBe(home);
  });

  it("toggles the preview and resets it to playing on the next card", () => {
    let s = gameReducer(play(), { type: "setPreview", playing: false });
    expect(s.playing).toBe(false);
    s = run(s, { type: "guess", dir: "higher" }, { type: "advance" });
    expect(s.playing).toBe(true);
  });
});
