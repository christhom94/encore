"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { SAMPLE_ARTIST, SAMPLE_DECK } from "@/data/sample-deck";
import type { Card } from "@/game/types";
import type { DeckResponse } from "@/server/game";
import { Game } from "./Game";
import { BackIcon } from "./icons";
import { Bento, Tile } from "./Tile";
import { Cta, Eyebrow, Footer, IconButton } from "./ui";

const POLL_MS = 3000;

/** The deck URL, passing ?seed= through so tests and links can reproduce a deck. */
function deckUrl(id: string) {
  const seed = new URLSearchParams(window.location.search).get("seed");
  return `/api/game/${id}/deck${seed ? `?seed=${encodeURIComponent(seed)}` : ""}`;
}

async function fetchDeck(id: string): Promise<DeckResponse | { status: "error" }> {
  try {
    const res = await fetch(deckUrl(id), { cache: "no-store" });
    return (await res.json()) as DeckResponse;
  } catch {
    return { status: "error" };
  }
}

/** /play/[artistId]: fetch a deck, waiting through a background ingest if needed. */
export function PlayRoute() {
  const { artistId } = useParams<{ artistId: string }>();
  const [state, setState] = useState<DeckResponse | { status: "loading" } | { status: "error" }>({
    status: "loading",
  });

  useEffect(() => {
    if (artistId === "sample") return; // the prototype's sample deck (review links)
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const load = async () => {
      const result = await fetchDeck(artistId);
      if (cancelled) return;
      setState(result);
      if (result.status === "pending") timer = setTimeout(load, POLL_MS);
    };
    load();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [artistId]);

  const newDeck = useCallback(async (): Promise<Card[] | null> => {
    const result = await fetchDeck(artistId);
    return result.status === "ready" ? result.deck : null;
  }, [artistId]);

  if (artistId === "sample") return <Game artist={SAMPLE_ARTIST} deck={SAMPLE_DECK} />;
  if (state.status === "ready") return <Game artist={state.artist} deck={state.deck} newDeck={newDeck} />;
  return <Waiting state={state} />;
}

function Waiting({
  state,
}: {
  state: Exclude<DeckResponse, { status: "ready" }> | { status: "loading" } | { status: "error" };
}) {
  const router = useRouter();
  const name = "artist" in state ? state.artist.name : "";

  let eyebrow = "Loading",
    title = "Tuning up…",
    body = "Shuffling the setlist.",
    dark = true;
  if (state.status === "pending") {
    eyebrow =
      state.job === "running"
        ? "Fetching setlists"
        : state.position > 0
          ? `${state.position} ahead in the queue`
          : "Next up";
    body = `We're counting every song ${name} has played live. Usually well under a minute.`;
  } else if (state.status === "failed") {
    eyebrow = "No encore";
    title = state.reason === "no_setlists" ? "No setlists yet." : "Couldn't fetch them.";
    body =
      state.reason === "no_setlists"
        ? `setlist.fm doesn't have any setlists with songs for ${name} yet.`
        : `Something went wrong getting ${name}'s setlists. Try again later.`;
    dark = false;
  } else if (state.status === "too_few") {
    eyebrow = "Short set";
    title = "Not enough songs.";
    body = `${name} has only ${state.eligible} songs played ${state.minPlays}+ times. A game needs at least ${state.needed}.`;
    dark = false;
  } else if (state.status === "unknown") {
    eyebrow = "Not found";
    title = "Who's that?";
    body = "We don't know this band yet. Search for them from the home screen.";
    dark = false;
  } else if (state.status === "error") {
    eyebrow = "Offline?";
    title = "No signal.";
    body = "We couldn't reach the server. Check your connection and try again.";
    dark = false;
  }
  const waiting = state.status === "pending" || state.status === "loading";

  return (
    <div className="stage">
      <main className="phone" aria-busy={waiting}>
        <div className="flex items-center justify-between gap-3">
          <IconButton onClick={() => router.push("/")} aria-label="Back to home">
            <BackIcon />
          </IconButton>
          <span className="truncate display text-[26px] tracking-[.02em]">{name}</span>
          <div className="w-11" />
        </div>
        <Bento>
          <Tile
            wide
            hero
            variant={dark ? "dark" : "paper"}
            className={dark ? "min-h-[260px] halftone-dark px-5 py-4" : "min-h-[260px] px-5 py-4"}
            data-testid="waiting"
            data-status={state.status}
          >
            <Eyebrow className={dark ? "text-paper" : "text-accent-text"}>{eyebrow}</Eyebrow>
            <div className="flex flex-col gap-3">
              <h1 className={dark ? "m-0 display text-[56px] text-higher" : "m-0 display text-[48px]"}>
                {title}
              </h1>
              <p className="m-0 text-[15px] leading-[1.4] font-medium">{body}</p>
              {state.status === "pending" && state.progress && <Progress text={state.progress} />}
            </div>
          </Tile>
        </Bento>
        {!waiting && (
          <Cta className="mt-6" onClick={() => router.push("/")}>
            Pick another band
          </Cta>
        )}
        <Footer text="Live counts from" />
      </main>
    </div>
  );
}

/** "Counting setlists: page 40 of 106" with a bar when the step reports x of y. */
function Progress({ text }: { text: string }) {
  const m = text.match(/(\d+) of (\d+)/);
  const fraction = m ? Math.min(1, Number(m[1]) / Number(m[2])) : null;
  return (
    <div className="flex flex-col gap-2" role="status" data-testid="ingest-progress">
      <span className="eyebrow text-paper">{text}</span>
      {fraction !== null && (
        <div className="relative h-2 overflow-hidden rounded-[4px] bg-paper/20" aria-hidden="true">
          <i className="progress-fill" style={{ width: `${fraction * 100}%` }} />
        </div>
      )}
    </div>
  );
}

/** Shown while the play page loads (Suspense fallback). */
export function PlayLoading() {
  return <Waiting state={{ status: "loading" }} />;
}
