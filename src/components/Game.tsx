"use client";

import { useCallback, useEffect, useReducer, useRef, useState, type CSSProperties } from "react";
import { readBest, writeBest } from "@/game/best";
import { canContinue, gameReducer, initialState, type GameState } from "@/game/reducer";
import { fmt } from "@/game/stats";
import type { Artist, Card, Direction } from "@/game/types";
import { themeFor } from "@/lib/color";
import { Header } from "./Header";
import { GameOverScreen } from "./screens/GameOverScreen";
import { HomeScreen } from "./screens/HomeScreen";
import { RevealScreen, verdictText } from "./screens/RevealScreen";
import { Footer, Toast } from "./ui";
import { SwipeDeck } from "./SwipeDeck";

interface GameProps {
  artist: Artist;
  deck: Card[];
}

export function Game({ artist, deck }: GameProps) {
  const [s, dispatch] = useReducer(gameReducer, deck, (d) => initialState(d));
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 1800);
  }, []);

  // Best streak per artist, kept in localStorage.
  useEffect(() => {
    dispatch({ type: "loadBest", best: readBest(artist.id) });
    const review = reviewState(deck);
    if (review) dispatch({ type: "restore", state: review });
  }, [artist.id, deck]);
  useEffect(() => {
    if (s.best > readBest(artist.id)) writeBest(artist.id, s.best);
  }, [artist.id, s.best]);

  const card = s.deck[s.i];
  // Album colour on play and reveal; house red everywhere else.
  const themed = s.screen === "play" || s.screen === "reveal";
  const theme = themeFor(themed ? card?.accent : null) as unknown as CSSProperties;

  const home = () => dispatch({ type: "home" });
  const onGuess = useCallback((dir: Direction) => dispatch({ type: "guess", dir }), []);
  const onTogglePreview = useCallback(() => dispatch({ type: "togglePreview" }), []);

  const share = () => {
    const text = `I got a ${s.streak} song streak on Encore guessing ${artist.name}'s live setlists.`;
    const copy = navigator.clipboard?.writeText(text);
    if (copy)
      copy.then(
        () => showToast("Copied to clipboard"),
        () => showToast(text),
      );
    else showToast(text);
  };

  const announcement =
    s.screen === "reveal" && s.last && card
      ? `${verdictText(s.last)} ${fmt(card.count)} times played live. Streak ${s.streak}.`
      : s.screen === "over"
        ? `${s.won ? "Setlist cleared." : "Game over."} ${s.streak} song streak.`
        : "";

  return (
    <div className="stage">
      <main className="phone" style={theme} data-screen={s.screen}>
        {s.screen === "home" && (
          <HomeScreen
            artist={artist}
            best={s.best}
            onStart={() => dispatch({ type: "start" })}
            onToast={showToast}
          />
        )}

        {s.screen === "play" && card && (
          <>
            <Header
              variant="play"
              artist={artist.name}
              songNumber={s.i + 1}
              streak={s.streak}
              onHome={home}
            />
            <SwipeDeck
              key={card.id}
              card={card}
              next={s.deck[s.i + 1]}
              playing={s.playing}
              onTogglePreview={onTogglePreview}
              onGuess={onGuess}
            />
            <Footer />
          </>
        )}

        {s.screen === "reveal" && card && s.last && (
          <RevealScreen
            artist={artist}
            card={card}
            songNumber={s.i + 1}
            streak={s.streak}
            last={s.last}
            canContinue={canContinue(s)}
            onAdvance={() => dispatch({ type: "advance" })}
            onHome={home}
          />
        )}

        {s.screen === "over" && (
          <GameOverScreen
            artist={artist}
            deck={s.deck}
            history={s.history}
            streak={s.streak}
            best={s.best}
            won={s.won}
            onRestart={() => dispatch({ type: "start" })}
            onShare={share}
            onHome={home}
          />
        )}

        <div className="sr-only" aria-live="polite" aria-atomic="true">
          {announcement}
        </div>
        <Toast message={toast} />
      </main>
    </div>
  );
}

/**
 * Review deep links, matching the prototype: ?screen=play[&song=0..9] | reveal | over.
 * On in development, or in a build with NEXT_PUBLIC_REVIEW_LINKS=1 (the Playwright suite).
 */
function reviewState(deck: Card[]): Partial<GameState> | null {
  if (process.env.NODE_ENV === "production" && process.env.NEXT_PUBLIC_REVIEW_LINKS !== "1") return null;
  const q = new URLSearchParams(window.location.search);
  const screen = q.get("screen");
  const ok = (i: number) => ({ i, ok: true, dir: "higher" as const });
  if (screen === "play") {
    const i = Math.min(deck.length - 1, Math.max(0, Number(q.get("song") ?? 3) || 0));
    return { screen: "play", i, streak: 4, playing: true };
  }
  if (screen === "reveal") {
    return {
      screen: "reveal",
      i: 3,
      streak: 5,
      last: { ok: true, truth: "higher", dir: "higher" },
      history: [0, 1, 2, 3].map(ok),
    };
  }
  if (screen === "over") {
    return {
      screen: "over",
      i: 5,
      streak: 5,
      won: false,
      last: { ok: false, truth: "lower", dir: "higher" },
      history: [0, 1, 2, 3, 4].map(ok).concat([{ i: 5, ok: false, dir: "higher" }]),
    };
  }
  return null;
}
