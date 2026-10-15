import { useEffect, useRef } from "react";
import { fmt, playedAtPercent } from "@/game/stats";
import type { Artist, Card, LastResult } from "@/game/types";
import { Thumb } from "../Art";
import { Header } from "../Header";
import { RightIcon } from "../icons";
import { albumLine, Meta } from "../SongCard";
import { Bento, Tile, TileNum } from "../Tile";
import { Cta, Eyebrow, Footer } from "../ui";

interface RevealProps {
  artist: Artist;
  card: Card;
  songNumber: number;
  streak: number;
  last: LastResult;
  canContinue: boolean;
  onAdvance: () => void;
  onHome: () => void;
}

export const verdictText = (last: LastResult) =>
  last.ok ? `Correct. ${last.truth === "higher" ? "Higher" : "Lower"} it is.` : `Nope. It was ${last.truth}.`;

export function RevealScreen({
  artist,
  card,
  songNumber,
  streak,
  last,
  canContinue,
  onAdvance,
  onHome,
}: RevealProps) {
  const cta = useRef<HTMLButtonElement>(null);
  useEffect(() => cta.current?.focus(), []);
  const diff = card.count - card.line;
  const small = "text-[11px] font-semibold";

  return (
    <>
      <Header
        variant="play"
        artist={artist.name}
        songNumber={songNumber}
        streak={streak}
        hot={last.ok}
        onHome={onHome}
      />
      <Bento>
        <Tile wide className="min-h-0 flex-row items-center justify-start gap-3 p-2">
          <Thumb card={card} />
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="display text-[24px] leading-[1.05]">{card.title}</span>
            <Meta className="text-[12px]">{albumLine(card)}</Meta>
          </div>
        </Tile>

        <Tile
          wide
          hero
          variant={last.ok ? "accent" : "dark"}
          className="min-h-[232px] px-[18px] py-4"
          style={last.ok ? undefined : { boxShadow: "5px 5px 0 var(--higher)" }}
          data-testid="verdict"
        >
          <span className="display text-[26px] leading-[1.1] tracking-[.02em]">{verdictText(last)}</span>
          <div className="flex flex-col">
            <span className="display text-[124px]">{fmt(card.count)}</span>
            <Eyebrow className="mt-1 text-[13px]">Times played live</Eyebrow>
          </div>
        </Tile>

        <Tile>
          <Eyebrow className="text-muted">Your line</Eyebrow>
          <TileNum>{fmt(card.line)}</TileNum>
        </Tile>
        <Tile>
          <Eyebrow className="text-muted">{diff >= 0 ? "Over by" : "Under by"}</Eyebrow>
          <TileNum className="text-accent-text">
            {diff >= 0 ? "+" : "−"}
            {fmt(Math.abs(diff))}
          </TileNum>
        </Tile>
        <Tile variant="dark">
          <Eyebrow>Played at</Eyebrow>
          <div className="flex items-baseline gap-1.5">
            <TileNum>{playedAtPercent(card.count, artist.totalSetlists)}%</TileNum>
            <small className={small}>of {fmt(artist.totalSetlists)} shows</small>
          </div>
        </Tile>
        <Tile variant="recessed">
          <Eyebrow>All-time rank</Eyebrow>
          <div className="flex items-baseline gap-1.5">
            <TileNum>#{card.rank}</TileNum>
            <small className={small}>most played</small>
          </div>
        </Tile>
      </Bento>

      <Cta ref={cta} className="mt-4" onClick={onAdvance}>
        {canContinue ? "Next song" : "See your run"}
        <RightIcon />
      </Cta>
      <Footer />
    </>
  );
}
