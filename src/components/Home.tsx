"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { readBest } from "@/game/best";
import { fmt } from "@/game/stats";
import type { PopularArtist, SearchResult } from "@/server/game";
import { HelpIcon, PlayIcon, SearchIcon } from "./icons";
import { Bento, Tile } from "./Tile";
import { cn, Eyebrow, Footer, IconButton, Toast } from "./ui";

/** Anton size that keeps long band names on the tile. */
const nameSize = (name: string, big: number) =>
  name.length > 16 ? big * 0.62 : name.length > 10 ? big * 0.76 : big;

export function Home() {
  const router = useRouter();
  const [popular, setPopular] = useState<PopularArtist[] | null>(null);
  const [best, setBest] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const showToast = useCallback((msg: string) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 1800);
  }, []);

  useEffect(() => {
    fetch("/api/artists/popular")
      .then((r) => r.json())
      .then(({ artists }: { artists: PopularArtist[] }) => {
        setPopular(artists);
        if (artists[0]) setBest(readBest(artists[0].id));
      })
      .catch(() => setPopular([]));
  }, []);

  const search = useSearch();

  const open = async (r: { id: string; name: string; status?: SearchResult["status"] }) => {
    if (r.status && r.status !== "ready") {
      // Queue a background ingest; the play page shows "Tuning up…" until it's ready.
      await fetch(`/api/artists/${r.id}/ingest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: r.name }),
      }).catch(() => undefined);
    }
    router.push(`/play/${r.id}`);
  };

  const [hero, second, third] = (popular ?? []).filter((a) => a.playable);

  return (
    <div className="stage">
      <main className="phone">
        <div className="flex items-center justify-between gap-3">
          <div className="display text-[34px] tracking-[.02em]">
            Encore<span className="text-higher">.</span>
          </div>
          <IconButton
            aria-label="How to play"
            onClick={() => showToast("Swipe right for higher, left for lower")}
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

        <label className="mt-4 flex h-14 shrink-0 items-center gap-3 rounded-[28px] bg-paper px-5 border-poster">
          <SearchIcon />
          <span className="sr-only">Search for a band or artist</span>
          <input
            type="search"
            value={search.q}
            onChange={(e) => search.setQ(e.target.value)}
            placeholder="Search any band or artist"
            autoComplete="off"
            className="min-w-0 flex-1 border-0 bg-transparent text-base font-medium text-ink outline-none placeholder:text-muted [&::-webkit-search-cancel-button]:appearance-none"
          />
        </label>

        {search.active ? (
          <SearchResults state={search} onOpen={open} />
        ) : (
          <>
            <Eyebrow className="mt-5 text-muted">Popular now</Eyebrow>
            <Bento className="mt-2.5">
              {hero ? (
                <Tile
                  as="button"
                  type="button"
                  variant="accent"
                  hero
                  wide
                  onClick={() => open(hero)}
                  className="min-h-[146px] cursor-pointer flex-row gap-3 p-3.5"
                >
                  <span className="flex min-w-0 flex-1 flex-col justify-between">
                    <Eyebrow>{fmt(hero.totalSetlists)} setlists</Eyebrow>
                    <span className="display break-words" style={{ fontSize: nameSize(hero.name, 42) }}>
                      {hero.name}
                    </span>
                    <span className="flex h-8 items-center gap-1.5 self-start rounded-2xl bg-ink px-3.5 text-[12px] font-bold tracking-[.1em] text-paper uppercase">
                      <PlayIcon />
                      Play
                    </span>
                  </span>
                  {hero.photo && (
                    <Image
                      src={hero.photo}
                      alt={hero.name}
                      width={264}
                      height={224}
                      priority
                      className="h-[112px] w-[132px] shrink-0 rounded-2xl object-cover object-[55%_30%] contrast-110 grayscale-100 border-poster"
                    />
                  )}
                </Tile>
              ) : (
                <Tile
                  wide
                  hero
                  variant="dark"
                  className="min-h-[146px] halftone-dark"
                  data-testid="popular-loading"
                >
                  <Eyebrow>{popular ? "No bands yet" : "Loading"}</Eyebrow>
                  <span className="display text-[30px] text-paper">
                    {popular ? "Search for one above" : "Tuning up…"}
                  </span>
                </Tile>
              )}

              {second ? <PhotoTile artist={second} onOpen={open} /> : <SearchPromptTile />}
              <Tile variant="dark" className="min-h-[116px]">
                <Eyebrow>Best streak</Eyebrow>
                <span className="display text-[54px] text-higher" data-testid="home-best">
                  {best}
                </span>
              </Tile>
              {third ? <PhotoTile artist={third} onOpen={open} /> : <SearchPromptTile />}
              <Tile
                as="button"
                type="button"
                variant="dashed"
                className="min-h-[116px]"
                onClick={() => showToast("Daily encore arrives in Stage 5")}
              >
                <Eyebrow className="text-accent-text">Daily encore</Eyebrow>
                <span className="text-[14px] leading-[1.3] font-semibold">
                  Same 10 songs for everyone today
                </span>
              </Tile>
            </Bento>
          </>
        )}
        <Footer text="Live counts from" />
        <Toast message={toast} />
      </main>
    </div>
  );
}

function PhotoTile({ artist, onOpen }: { artist: PopularArtist; onOpen: (a: PopularArtist) => void }) {
  return (
    <Tile as="button" type="button" variant="photo" aria-label={artist.name} onClick={() => onOpen(artist)}>
      {artist.photo ? (
        <Image
          src={artist.photo}
          alt=""
          fill
          sizes="180px"
          className="object-cover object-[50%_25%] contrast-110 grayscale-100"
        />
      ) : (
        <span className="absolute inset-0 halftone-dark" />
      )}
      <span className="absolute top-2 right-2 flex size-7 items-center justify-center rounded-full border-2 border-ink bg-higher">
        <PlayIcon size={10} />
      </span>
      <span
        className="absolute bottom-2 left-2 max-w-[calc(100%-16px)] truncate rounded-xl border-2 border-ink bg-paper px-2.5 pt-[3px] pb-[5px] display leading-[1.05]"
        style={{ fontSize: artist.name.length > 12 ? 16 : 20 }}
      >
        {artist.name}
      </span>
    </Tile>
  );
}

function SearchPromptTile() {
  return (
    <Tile variant="recessed" className="min-h-[116px]">
      <Eyebrow className="text-muted">Any band</Eyebrow>
      <span className="text-[14px] leading-[1.3] font-semibold">Search above to play a band you love</span>
    </Tile>
  );
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

type SearchState = ReturnType<typeof useSearch>;

function useSearch() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState(false);
  const query = q.trim();

  useEffect(() => {
    if (query.length < 2) return;
    const ctrl = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true);
      fetch(`/api/artists/search?q=${encodeURIComponent(query)}`, { signal: ctrl.signal })
        .then((r) => r.json())
        .then((body: { results: SearchResult[]; apiError?: boolean }) => {
          setResults(body.results);
          setApiError(!!body.apiError);
          setLoading(false);
        })
        .catch(() => {
          if (!ctrl.signal.aborted) {
            setApiError(true);
            setLoading(false);
          }
        });
    }, 300); // debounce typing
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [query]);

  return {
    q,
    setQ,
    query,
    results: query.length >= 2 ? results : [],
    loading,
    apiError,
    active: query.length >= 2,
  };
}

const STATUS_LABEL: Record<SearchResult["status"], string> = {
  ready: "Play",
  pending: "Tuning up",
  new: "Fetch",
};

function SearchResults({ state, onOpen }: { state: SearchState; onOpen: (r: SearchResult) => void }) {
  return (
    <section className="mt-5 flex min-h-0 flex-1 flex-col" aria-live="polite" aria-busy={state.loading}>
      <Eyebrow className="text-muted">{state.loading ? "Searching…" : "Bands"}</Eyebrow>
      <ul className="mt-2.5 flex min-h-0 flex-col gap-2 overflow-y-auto pb-1" data-testid="search-results">
        {state.results.map((r) => (
          <li key={r.id}>
            <button
              type="button"
              onClick={() => onOpen(r)}
              className="flex min-h-[60px] w-full items-center gap-3 rounded-tile bg-paper px-3.5 py-2 text-left border-poster"
            >
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate display text-[22px] leading-[1.1]">{r.name}</span>
                {(r.disambiguation || r.totalSetlists) && (
                  <span className="truncate text-[12px] font-semibold text-muted">
                    {[r.disambiguation, r.totalSetlists ? `${fmt(r.totalSetlists)} setlists` : null]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                )}
              </span>
              <span
                className={cn(
                  "flex h-8 shrink-0 items-center gap-1.5 rounded-2xl px-3 text-[11px] font-bold tracking-[.1em] uppercase",
                  r.status === "ready" ? "bg-ink text-paper" : "border-2 border-ink bg-tile text-ink",
                )}
              >
                {r.status === "ready" && <PlayIcon size={10} />}
                {STATUS_LABEL[r.status]}
              </span>
            </button>
          </li>
        ))}
      </ul>
      {!state.loading && state.results.length === 0 && (
        <p className="mt-1 text-[14px] font-semibold text-muted">
          {state.apiError
            ? "Search is having a moment. Try again shortly."
            : `No bands found for “${state.query}”.`}
        </p>
      )}
      {state.apiError && state.results.length > 0 && (
        <p className="mt-2 text-[12px] font-semibold text-muted">
          Showing bands we already have; setlist.fm search is unavailable.
        </p>
      )}
    </section>
  );
}
