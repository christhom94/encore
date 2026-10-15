import { BackIcon, CloseIcon } from "./icons";
import { cn, Eyebrow, IconButton } from "./ui";

export function StreakChip({ streak, hot }: { streak: number; hot?: boolean }) {
  return (
    <div
      className={cn(
        "streak-chip flex h-11 items-center gap-2 rounded-full px-4 border-poster",
        hot ? "bg-higher text-on-higher" : "bg-lower text-paper",
      )}
      data-hot={!!hot}
      data-testid="streak"
    >
      <Eyebrow>Streak</Eyebrow>
      <span className="display text-[24px]">{streak}</span>
    </div>
  );
}

type HeaderProps =
  | { variant: "play"; artist: string; songNumber: number; streak: number; hot?: boolean; onHome: () => void }
  | { variant: "close"; artist: string; onHome: () => void };

/** Game header: back (or close), song number and artist, streak chip. */
export function Header(props: HeaderProps) {
  const close = props.variant === "close";
  return (
    <div className="flex items-center justify-between gap-3">
      <IconButton onClick={props.onHome} aria-label={close ? "Close and go home" : "Back to home"}>
        {close ? <CloseIcon /> : <BackIcon />}
      </IconButton>
      <div className="flex flex-col items-center gap-px">
        {!close && <Eyebrow className="text-muted">Song {String(props.songNumber).padStart(2, "0")}</Eyebrow>}
        <span className="display text-[26px] tracking-[.02em]">{props.artist}</span>
      </div>
      {close ? <div className="w-11" /> : <StreakChip streak={props.streak} hot={props.hot} />}
    </div>
  );
}
