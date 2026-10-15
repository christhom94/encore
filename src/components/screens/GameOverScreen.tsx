import Image from "next/image";
import { fmt, levelFor } from "@/game/stats";
import type { Artist, Card, Guess } from "@/game/types";
import { Thumb } from "../Art";
import { Header } from "../Header";
import { CrossIcon, TickIcon } from "../icons";
import { Bento, Tile } from "../Tile";
import { cn, Cta, Eyebrow, Footer, GhostButton } from "../ui";

interface GameOverProps {
  artist: Artist;
  deck: Card[];
  history: Guess[];
  streak: number;
  best: number;
  won: boolean;
  onRestart: () => void;
  onShare: () => void;
  onHome: () => void;
}

export function GameOverScreen({
  artist,
  deck,
  history,
  streak,
  best,
  won,
  onRestart,
  onShare,
  onHome,
}: GameOverProps) {
  const { level, next } = levelFor(streak);
  const lastGuess = history.at(-1);
  const miss = lastGuess && !lastGuess.ok ? deck[lastGuess.i] : null;

  return (
    <>
      <Header variant="close" artist={artist.name} onHome={onHome} />
      <Bento>
        <Tile
          variant="dark"
          hero
          wide
          // Ink shadow, as in design/screens/05 (the prototype's accent shadow is overridden there).
          className="min-h-[196px] px-5 py-4"
        >
          <span className="display text-[28px] tracking-[.02em]">
            {won ? "Setlist cleared." : "Game over."}
          </span>
          <div className="flex items-end gap-3.5">
            <span className="display text-[132px] leading-[.85] text-higher" data-testid="final-streak">
              {streak}
            </span>
            <span className="pb-1.5 display text-[28px]">
              Song
              <br />
              streak
            </span>
          </div>
        </Tile>
        <Tile>
          <Eyebrow className="text-muted">Your best</Eyebrow>
          <span className="display text-[50px]">{best}</span>
        </Tile>
        <Tile variant="accent">
          <Eyebrow>Fan level</Eyebrow>
          <div className="flex flex-col gap-0.5">
            <span className="display text-[30px]">{level}</span>
            <span className="text-[12px] font-semibold">{next}</span>
          </div>
        </Tile>
        {miss && lastGuess && (
          <Tile wide className="min-h-0 flex-row items-center justify-start gap-3 p-2.5">
            <Thumb card={miss} size={60} />
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <Eyebrow className="text-accent-text">The one that got you</Eyebrow>
              <span className="display text-[26px] leading-[1.05]">{miss.title}</span>
              <span className="text-[13px] font-medium">
                You said {lastGuess.dir} than {fmt(miss.line)}. Played {fmt(miss.count)}.
              </span>
            </div>
          </Tile>
        )}
      </Bento>

      <Eyebrow className="mt-4 text-muted">Your run</Eyebrow>
      <RunStrip deck={deck} history={history} />

      <Cta className="mt-[18px]" onClick={onRestart}>
        Play {artist.name} again
      </Cta>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <GhostButton onClick={onShare}>Share streak</GhostButton>
        <GhostButton onClick={onHome}>New band</GhostButton>
      </div>
      <Footer />
    </>
  );
}

/** The last six guesses as covers with tick and cross badges. */
export function RunStrip({ deck, history }: { deck: Card[]; history: Guess[] }) {
  return (
    <div className="mt-2.5 flex gap-2">
      {history.slice(-6).map((h) => {
        const card = deck[h.i];
        return (
          <div key={h.i} className="flex flex-col items-center gap-1.5 text-[12px] font-bold tabular-nums">
            <div
              className={cn(
                "relative size-[52px] rounded-thumb halftone-dark border-poster",
                !h.ok && "shadow-[3px_3px_0_var(--higher)]",
              )}
              style={{ backgroundSize: "6px 6px" }}
              role="img"
              aria-label={`${card.title}, ${h.ok ? "correct" : "wrong"}`}
            >
              {card.cover && (
                <Image
                  src={card.cover}
                  alt=""
                  width={104}
                  height={104}
                  className="block size-full rounded-[9px] object-cover"
                />
              )}
              <span
                className={cn(
                  "absolute -top-2 -right-2 flex size-[22px] items-center justify-center rounded-full border-2 border-ink",
                  h.ok ? "bg-higher" : "bg-ink",
                )}
              >
                {h.ok ? <TickIcon color="#1C1C1F" /> : <CrossIcon color="#F8F6F2" />}
              </span>
            </div>
            {fmt(card.count)}
          </div>
        );
      })}
    </div>
  );
}
