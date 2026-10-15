import type { Card, Direction, Guess, LastResult, Screen } from "./types";

export interface GameState {
  screen: Screen;
  deck: Card[];
  /** Index of the current card. */
  i: number;
  streak: number;
  /** Best streak for this artist (persisted by the caller). */
  best: number;
  history: Guess[];
  last: LastResult | null;
  /** True when the whole deck was cleared. */
  won: boolean;
  /** Preview playing (state only until Stage 3). */
  playing: boolean;
}

export type GameAction =
  | { type: "start" }
  | { type: "guess"; dir: Direction }
  | { type: "advance" }
  | { type: "home" }
  | { type: "togglePreview" }
  | { type: "loadBest"; best: number }
  | { type: "restore"; state: Partial<GameState> };

export const truthFor = (card: Pick<Card, "count" | "line">): Direction =>
  card.count > card.line ? "higher" : "lower";

export function initialState(deck: Card[], best = 0): GameState {
  return { screen: "home", deck, i: 0, streak: 0, best, history: [], last: null, won: false, playing: true };
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "start":
      return {
        ...state,
        screen: "play",
        i: 0,
        streak: 0,
        history: [],
        last: null,
        won: false,
        playing: true,
      };

    case "guess": {
      if (state.screen !== "play") return state;
      const card = state.deck[state.i];
      if (!card) return state;
      const truth = truthFor(card);
      const ok = action.dir === truth;
      const streak = ok ? state.streak + 1 : state.streak;
      return {
        ...state,
        screen: "reveal",
        streak,
        best: Math.max(state.best, streak),
        history: [...state.history, { i: state.i, dir: action.dir, ok }],
        last: { ok, truth, dir: action.dir },
      };
    }

    // From the reveal: next card after a correct guess, otherwise game over.
    case "advance": {
      if (state.screen !== "reveal" || !state.last) return state;
      const hasNext = state.i + 1 < state.deck.length;
      if (state.last.ok && hasNext) return { ...state, screen: "play", i: state.i + 1, playing: true };
      return { ...state, screen: "over", won: state.last.ok };
    }

    case "home":
      return { ...state, screen: "home" };

    case "togglePreview":
      return { ...state, playing: !state.playing };

    case "loadBest":
      return { ...state, best: Math.max(state.best, action.best) };

    case "restore":
      return { ...state, ...action.state };
  }
}

/** True when the reveal's button should say "Next song" rather than "See your run". */
export const canContinue = (s: GameState) => !!s.last?.ok && s.i + 1 < s.deck.length;
