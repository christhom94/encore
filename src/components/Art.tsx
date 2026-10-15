import Image from "next/image";
import type { CSSProperties } from "react";
import type { Card } from "@/game/types";
import { cn } from "./ui";

/** Cover art for the card, or the halftone placeholder when there is no cover. */
export function CoverArt({ card, priority }: { card: Card; priority?: boolean }) {
  if (!card.cover) {
    return (
      <div
        className="flex h-[300px] w-full items-center justify-center rounded-art halftone-dark eyebrow text-paper"
        role="img"
        aria-label="Cover art placeholder"
      >
        Cover art
      </div>
    );
  }
  return (
    <Image
      src={card.cover}
      alt={`${card.album} cover`}
      width={600}
      height={600}
      sizes="358px"
      priority={priority}
      draggable={false}
      className="pointer-events-none block h-[300px] w-full rounded-art object-cover select-none"
    />
  );
}

/** Small square cover (reveal strip, game over). Halftone when there is no cover. */
export function Thumb({
  card,
  size = 56,
  decorative,
  className,
}: {
  card: Card;
  size?: number;
  decorative?: boolean;
  className?: string;
}) {
  const style: CSSProperties = { width: size, height: size };
  if (!card.cover) {
    return (
      <div
        className={cn("shrink-0 rounded-thumb halftone-dark", className)}
        style={{ ...style, backgroundSize: "7px 7px" }}
        aria-hidden="true"
      />
    );
  }
  return (
    <Image
      src={card.cover}
      alt={decorative ? "" : `${card.album} cover`}
      width={size * 2}
      height={size * 2}
      className={cn("block shrink-0 rounded-thumb object-cover", className)}
      style={style}
    />
  );
}
