import Image from "next/image";
import { SAMPLE_POPULAR } from "@/data/sample-deck";
import { fmt } from "@/game/stats";
import type { Artist } from "@/game/types";
import { HelpIcon, PlayIcon, SearchIcon } from "../icons";
import { Bento, Tile } from "../Tile";
import { Eyebrow, Footer, IconButton } from "../ui";

interface HomeProps {
  artist: Artist;
  best: number;
  onStart: () => void;
  onToast: (msg: string) => void;
}

export function HomeScreen({ artist, best, onStart, onToast }: HomeProps) {
  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <div className="display text-[34px] tracking-[.02em]">
          Encore<span className="text-higher">.</span>
        </div>
        <IconButton
          aria-label="How to play"
          onClick={() => onToast("Swipe right for higher, left for lower")}
        >
          <HelpIcon />
        </IconButton>
      </div>

      <h1 className="mt-3.5 mb-0 display text-[60px] leading-[.95]">
        <span className="text-higher">Higher</span>
        <br />
        or lower?
      </h1>
      <p className="mt-2.5 mb-0 text-base leading-[1.4] font-medium text-muted">
        Guess how many times a band has played each song live.
      </p>

      <label className="mt-4 flex h-14 items-center gap-3 rounded-[28px] bg-paper px-5 border-poster">
        <SearchIcon />
        <span className="sr-only">Search for a band or artist</span>
        <input
          type="search"
          placeholder="Search any band or artist"
          className="min-w-0 flex-1 border-0 bg-transparent text-base font-medium text-ink outline-none placeholder:text-muted"
        />
      </label>

      <Eyebrow className="mt-5 text-muted">Popular now</Eyebrow>
      <Bento className="mt-2.5">
        <Tile
          as="button"
          type="button"
          variant="accent"
          hero
          wide
          onClick={onStart}
          className="min-h-[146px] cursor-pointer flex-row gap-3 p-3.5"
        >
          <span className="flex flex-1 flex-col justify-between">
            <Eyebrow>{fmt(artist.totalSetlists)} setlists</Eyebrow>
            <span className="display text-[42px]">{artist.name}</span>
            <span className="flex h-8 items-center gap-1.5 self-start rounded-2xl bg-ink px-3.5 text-[12px] font-bold tracking-[.1em] text-paper uppercase">
              <PlayIcon />
              Play
            </span>
          </span>
          {artist.photo && (
            <Image
              src={artist.photo}
              alt={artist.name}
              width={264}
              height={224}
              priority
              className="h-[112px] w-[132px] shrink-0 rounded-2xl object-cover object-[55%_30%] contrast-110 grayscale-100 border-poster"
            />
          )}
        </Tile>

        <PhotoTile {...SAMPLE_POPULAR[0]} onClick={() => onToast("Only Metallica is wired up for now")} />
        <Tile variant="dark" className="min-h-[116px]">
          <Eyebrow>Best streak</Eyebrow>
          <span className="display text-[54px] text-higher" data-testid="home-best">
            {best}
          </span>
        </Tile>
        <PhotoTile {...SAMPLE_POPULAR[1]} onClick={() => onToast("Only Metallica is wired up for now")} />
        <Tile
          as="button"
          type="button"
          variant="dashed"
          className="min-h-[116px]"
          onClick={() => onToast("Daily encore arrives in Stage 5")}
        >
          <Eyebrow className="text-accent-text">Daily encore</Eyebrow>
          <span className="text-[14px] leading-[1.3] font-semibold">Same 10 songs for everyone today</span>
        </Tile>
      </Bento>
      <Footer text="Live counts from" />
    </>
  );
}

function PhotoTile({
  name,
  photo,
  position,
  onClick,
}: {
  name: string;
  photo: string;
  position: string;
  onClick: () => void;
}) {
  return (
    <Tile as="button" type="button" variant="photo" aria-label={name} onClick={onClick}>
      <Image
        src={photo}
        alt=""
        fill
        sizes="180px"
        className="object-cover contrast-110 grayscale-100"
        style={{ objectPosition: position }}
      />
      <span className="absolute top-2 right-2 flex size-7 items-center justify-center rounded-full border-2 border-ink bg-higher">
        <PlayIcon size={10} />
      </span>
      <span className="absolute bottom-2 left-2 rounded-xl border-2 border-ink bg-paper px-2.5 pt-[3px] pb-[5px] display text-[20px] leading-[1.05]">
        {name}
      </span>
    </Tile>
  );
}
