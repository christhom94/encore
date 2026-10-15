import type { ReactNode } from "react";
import { fmt } from "@/game/stats";
import type { Card } from "@/game/types";
import { CoverArt } from "./Art";
import { PauseIcon, PlayIcon } from "./icons";
import { cn, Eyebrow } from "./ui";

export const cardShell = "border-poster absolute inset-0 flex flex-col gap-3 rounded-card bg-paper p-3";

export const albumLine = (c: Card) => [c.album, c.year].filter(Boolean).join(" · ");

export function Meta({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn("text-[13px] font-semibold tracking-[.08em] text-muted uppercase", className)}>
      {children}
    </div>
  );
}

/** Preview control. Toggles state only until real audio arrives in Stage 3. */
export function PreviewBar({ playing, onToggle }: { playing: boolean; onToggle: () => void }) {
  return (
    <div className="flex items-center gap-2.5 px-1">
      <button
        type="button"
        onClick={onToggle}
        onPointerDown={(e) => e.stopPropagation()}
        aria-label={playing ? "Pause preview" : "Play preview"}
        aria-pressed={playing}
        className="flex size-10 shrink-0 items-center justify-center rounded-full border-0 bg-ink p-0 text-paper"
      >
        {playing ? <PauseIcon /> : <PlayIcon size={14} />}
      </button>
      <div className="relative h-2 flex-1 overflow-hidden rounded-[4px] bg-tile" aria-hidden="true">
        <i className="progress-fill" style={{ animationPlayState: playing ? "running" : "paused" }} />
      </div>
      <span className="text-[12px] font-bold">0:30</span>
    </div>
  );
}

/** "Played live more or less than / 1,500 / Times?" */
export function LineBox({ line }: { line: number }) {
  return (
    <div className="mt-auto rounded-art bg-tile px-4 pt-2.5 pb-3">
      <Eyebrow className="text-muted">Played live more or less than</Eyebrow>
      <div className="flex items-baseline justify-between gap-2.5">
        <span className="display text-[80px]" data-testid="line">
          {fmt(line)}
        </span>
        <span className="display text-[26px] text-accent-text">Times?</span>
      </div>
    </div>
  );
}

export function SongTitle({ title }: { title: string }) {
  return (
    <h1 className={cn("m-0 display whitespace-nowrap", title.length > 17 ? "text-[30px]" : "text-[38px]")}>
      {title}
    </h1>
  );
}

/** The card underneath the top card. */
export function NextCard({ card }: { card: Card }) {
  return (
    <div className={cardShell} aria-hidden="true">
      <div className="relative h-[300px] shrink-0 rounded-art">
        <CoverArt card={card} />
      </div>
      <div className="flex flex-col gap-1 px-1">
        <Eyebrow className="text-muted">Up next</Eyebrow>
        <span className="display text-[38px]">{card.title}</span>
      </div>
    </div>
  );
}
