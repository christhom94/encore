"use client";

import {
  animate,
  motion,
  useDragControls,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useTransform,
  type PanInfo,
} from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Card, Direction } from "@/game/types";
import { CoverArt } from "./Art";
import { LeftIcon, RightIcon } from "./icons";
import { albumLine, cardShell, LineBox, Meta, NextCard, PreviewBar, SongTitle } from "./SongCard";
import { cn } from "./ui";
import { usePreviewAudio } from "./usePreviewAudio";

/** Horizontal drag (px) that commits a guess. */
export const SWIPE_THRESHOLD = 90;
const FLY_OUT = 620;
const EASE = [0.2, 0.7, 0.3, 1] as const;

type Arm = { hi: boolean; lo: boolean; dimHi: boolean; dimLo: boolean };
const NO_ARM: Arm = { hi: false, lo: false, dimHi: false, dimLo: false };
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

function armFor(x: number): Arm {
  const a = clamp01(x / SWIPE_THRESHOLD),
    b = clamp01(-x / SWIPE_THRESHOLD);
  return { hi: a >= 1, lo: b >= 1, dimHi: b > 0.3, dimLo: a > 0.3 };
}

interface SwipeDeckProps {
  card: Card;
  next?: Card;
  /** Preview wanted (the player can pause it; it resets to on for each card). */
  playing: boolean;
  onPreviewChange: (playing: boolean) => void;
  onGuess: (dir: Direction) => void;
}

/**
 * The card stack plus the Lower/Higher buttons. Drag the top card on the x axis
 * (rotating x/18 degrees), or use the buttons or arrow keys. Mount with
 * key={card.id} so each card starts centred.
 */
export function SwipeDeck({ card, next, playing, onPreviewChange, onGuess }: SwipeDeckProps) {
  const preview = usePreviewAudio(card.trackId, playing, onPreviewChange);
  const pausePreview = preview.pause;
  const reduce = useReducedMotion();
  const x = useMotionValue(0);
  const rotate = useTransform(x, (v) => (reduce ? 0 : v / 18));
  const hiOpacity = useTransform(x, (v) => clamp01(v / SWIPE_THRESHOLD));
  const loOpacity = useTransform(x, (v) => clamp01(-v / SWIPE_THRESHOLD));
  const drag = useDragControls();
  const [arm, setArm] = useState<Arm>(NO_ARM);
  const committed = useRef(false);

  useMotionValueEvent(x, "change", (v) => {
    const nextArm = armFor(v);
    setArm((prev) =>
      prev.hi === nextArm.hi &&
      prev.lo === nextArm.lo &&
      prev.dimHi === nextArm.dimHi &&
      prev.dimLo === nextArm.dimLo
        ? prev
        : nextArm,
    );
  });

  const commit = useCallback(
    (dir: Direction) => {
      if (committed.current) return;
      committed.current = true;
      pausePreview();
      if (reduce) {
        onGuess(dir);
        return;
      }
      animate(x, dir === "higher" ? FLY_OUT : -FLY_OUT, { duration: 0.3, ease: EASE }).then(() =>
        onGuess(dir),
      );
    },
    [onGuess, reduce, x, pausePreview],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.key === "ArrowRight") commit("higher");
      else if (e.key === "ArrowLeft") commit("lower");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [commit]);

  const onDragEnd = (_: unknown, info: PanInfo) => {
    const dx = x.get() || info.offset.x;
    if (dx > SWIPE_THRESHOLD) commit("higher");
    else if (dx < -SWIPE_THRESHOLD) commit("lower");
    else if (reduce) x.set(0);
    else animate(x, 0, { type: "spring", stiffness: 520, damping: 34 });
  };

  return (
    <>
      <div className="relative mt-3.5 h-[596px]">
        {next && <NextCard card={next} />}
        <motion.div
          data-testid="top-card"
          className={cn(cardShell, "cursor-grab touch-none shadow-card select-none active:cursor-grabbing")}
          style={{ x, rotate, transformOrigin: "50% 110%" }}
          drag="x"
          dragControls={drag}
          dragListener={false}
          dragMomentum={false}
          onPointerDown={(e) => {
            if (!committed.current) drag.start(e);
          }}
          onDragEnd={onDragEnd}
        >
          <div className="relative h-[300px] shrink-0 rounded-art">
            <CoverArt card={card} priority />
            <motion.div className="stamp stamp-hi" style={{ opacity: hiOpacity }} aria-hidden="true">
              Higher
            </motion.div>
            <motion.div className="stamp stamp-lo" style={{ opacity: loOpacity }} aria-hidden="true">
              Lower
            </motion.div>
          </div>
          <div className="flex flex-col gap-1 px-1">
            <SongTitle title={card.title} />
            <Meta>{albumLine(card)}</Meta>
          </div>
          <PreviewBar
            playing={playing}
            available={!!card.trackId && preview.status !== "error"}
            progress={preview.progress}
            remaining={preview.remaining}
            onToggle={preview.toggle}
          />
          <LineBox line={card.line} />
        </motion.div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2.5">
        <button
          type="button"
          className="choice flex h-[60px] items-center justify-center gap-2 rounded-[30px] bg-lower display text-[24px] tracking-[.03em] text-paper border-poster"
          data-armed={arm.lo}
          data-dim={arm.dimLo}
          onClick={() => commit("lower")}
        >
          <LeftIcon />
          Lower
        </button>
        <button
          type="button"
          className="choice flex h-[60px] items-center justify-center gap-2 rounded-[30px] bg-higher display text-[24px] tracking-[.03em] text-on-higher border-poster"
          data-armed={arm.hi}
          data-dim={arm.dimHi}
          onClick={() => commit("higher")}
        >
          Higher
          <RightIcon />
        </button>
      </div>
      <div className="mt-3 text-center text-[11px] font-semibold tracking-[.08em] text-muted uppercase">
        Drag the card or tap a button
      </div>
    </>
  );
}
