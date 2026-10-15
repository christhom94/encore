import type { ComponentProps, ReactNode } from "react";
import { extendTailwindMerge } from "tailwind-merge";

const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      color: ["bg", "paper", "ink", "muted", "higher", "on-higher", "lower", "tile", "accent-text"],
      radius: ["card", "hero", "tile", "art", "thumb", "pill"],
      shadow: ["hard", "card"],
    },
  },
});

/** Join class names; later Tailwind classes override earlier ones (e.g. padding on a Tile). */
export const cn = (...c: (string | false | null | undefined)[]) => twMerge(c.filter(Boolean).join(" "));

export function Eyebrow({ className, children }: { className?: string; children: ReactNode }) {
  return <span className={cn("eyebrow", className)}>{children}</span>;
}

export function IconButton({ className, ...rest }: ComponentProps<"button">) {
  return (
    <button
      type="button"
      className={cn(
        "flex size-11 shrink-0 items-center justify-center rounded-full bg-paper p-0 text-ink border-poster",
        className,
      )}
      {...rest}
    />
  );
}

/** Credit line. Required on every screen that shows play counts. */
export function Footer({ text = "Counts from", previews }: { text?: string; previews?: boolean }) {
  return (
    <div className="mt-auto pt-3 text-center text-[11px] font-semibold tracking-[.08em] text-muted uppercase">
      {text}{" "}
      <a className="underline" href="https://www.setlist.fm" target="_blank" rel="noopener noreferrer">
        setlist.fm
      </a>
      {previews && (
        <>
          {" · Previews from "}
          <a className="underline" href="https://www.deezer.com" target="_blank" rel="noopener noreferrer">
            Deezer
          </a>
        </>
      )}
    </div>
  );
}

/** Primary pill button (ink). */
export function Cta({ className, ...rest }: ComponentProps<"button">) {
  return (
    <button
      type="button"
      className={cn(
        "flex h-[58px] w-full items-center justify-center gap-2.5 rounded-[29px] border-0 bg-ink display text-[24px] tracking-[.03em] text-paper",
        className,
      )}
      {...rest}
    />
  );
}

/** Secondary outlined pill button. */
export function GhostButton({ className, ...rest }: ComponentProps<"button">) {
  return (
    <button
      type="button"
      className={cn(
        "flex h-[50px] items-center justify-center rounded-[25px] bg-paper text-[13px] font-bold tracking-[.1em] text-ink uppercase border-poster",
        className,
      )}
      {...rest}
    />
  );
}

export function Toast({ message }: { message: string | null }) {
  return (
    <div className="toast" data-show={!!message} role="status">
      {message}
    </div>
  );
}
