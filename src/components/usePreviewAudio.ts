"use client";

// 30-second Deezer previews, played through the shared element in src/lib/audio.ts.

import { useCallback, useEffect, useRef, useState } from "react";
import { previewElement as audio, unlockAudio } from "@/lib/audio";

export type PreviewStatus = "none" | "loading" | "ready" | "error";

export interface PreviewState {
  status: PreviewStatus;
  /** 0 to 1. */
  progress: number;
  /** Seconds left. */
  remaining: number;
}

/**
 * Plays the preview for trackId while `playing` is true. `setPlaying` is
 * called when the browser blocks playback or the preview ends.
 */
export function usePreviewAudio(trackId: number | null, playing: boolean, setPlaying: (on: boolean) => void) {
  const [state, setState] = useState<PreviewState>({
    status: trackId ? "loading" : "none",
    progress: 0,
    remaining: 30,
  });
  const playingRef = useRef(playing);
  useEffect(() => {
    playingRef.current = playing;
  }, [playing]);

  // Fetch a fresh preview URL (they expire) and load it.
  useEffect(() => {
    if (!trackId) return;
    const ctrl = new AbortController();
    const a = audio();
    a.pause();
    fetch(`/api/preview/${trackId}`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then(({ url }: { url: string }) => {
        a.src = url;
        a.currentTime = 0;
        setState({ status: "ready", progress: 0, remaining: 30 });
      })
      .catch((err) => {
        if (!ctrl.signal.aborted) {
          setState({ status: "error", progress: 0, remaining: 30 });
          if (err) setPlaying(false);
        }
      });
    return () => {
      ctrl.abort();
      a.pause();
    };
  }, [trackId, setPlaying]);

  // Start or stop with the playing flag.
  useEffect(() => {
    if (state.status !== "ready") return;
    const a = audio();
    if (!playing) {
      a.pause();
      return;
    }
    // Refused before the player's first tap (autoplay rules): show the play button instead.
    a.play().catch(() => setPlaying(false));
  }, [state.status, playing, setPlaying]);

  // The progress bar follows the audio.
  useEffect(() => {
    if (state.status !== "ready") return;
    const a = audio();
    let frame = 0;
    const tick = () => {
      const duration = Number.isFinite(a.duration) && a.duration > 0 ? a.duration : 30;
      setState((s) => {
        const progress = Math.min(1, a.currentTime / duration);
        const remaining = Math.max(0, Math.ceil(duration - a.currentTime));
        return s.progress === progress && s.remaining === remaining ? s : { ...s, progress, remaining };
      });
      if (!a.paused) frame = requestAnimationFrame(tick);
    };
    const onPlay = () => (frame = requestAnimationFrame(tick));
    const onEnded = () => setPlaying(false);
    a.addEventListener("play", onPlay);
    a.addEventListener("pause", tick);
    a.addEventListener("seeked", tick);
    a.addEventListener("ended", onEnded);
    if (!a.paused) onPlay();
    return () => {
      cancelAnimationFrame(frame);
      a.removeEventListener("play", onPlay);
      a.removeEventListener("pause", tick);
      a.removeEventListener("seeked", tick);
      a.removeEventListener("ended", onEnded);
    };
  }, [state.status, setPlaying]);

  /** For the play/pause button: acts inside the tap so Safari allows it. */
  const toggle = useCallback(() => {
    unlockAudio();
    const a = audio();
    if (playingRef.current) {
      a.pause();
      setPlaying(false);
    } else {
      if (state.status === "ready") {
        if (a.ended) a.currentTime = 0;
        a.play().catch(() => setPlaying(false));
      }
      setPlaying(true);
    }
  }, [setPlaying, state.status]);

  const pause = useCallback(() => audio().pause(), []);

  return { ...state, toggle, pause };
}
