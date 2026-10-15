import type { SongCount } from "./types";

// What counts as a song (docs/DATA.md section 3). Covers and medleys are kept.
// Tapes, intros and bare solos or jams are excluded and listed in the ingest
// summary so the rules can be reviewed. Edit the lists below to tune them.

export type ExcludedReason = "tape" | "intro" | "solo" | "jam";

/** Exact names (case-insensitive) for things played over the PA or between songs. */
export const INTRO_NAMES = ["intro", "outro", "intro tape", "outro tape", "encore break", "soundcheck"];

/** An entry that is only a solo: up to this many words before "solo", e.g. "Kirk Hammett Guitar Solo". */
export const SOLO_PATTERN = /^(?:[^\s]+\s+){0,3}solos?$/i;

/** An entry that is only a jam or noodle, e.g. "Jam", "Kirk & Rob Jam", "Doodle". */
export const JAM_PATTERN = /^(?:[^\s]+\s+){0,3}(?:jam|jamming|improvisation|doodle|noodle)$/i;

export function excludedReason(song: Pick<SongCount, "name" | "isTape">): ExcludedReason | null {
  const name = song.name.trim();
  if (song.isTape) return "tape";
  if (INTRO_NAMES.includes(name.toLowerCase())) return "intro";
  if (SOLO_PATTERN.test(name)) return "solo";
  if (JAM_PATTERN.test(name)) return "jam";
  return null;
}

/** Medleys are kept; we flag them so they can be shown or tuned later. */
export function isMedley(name: string): boolean {
  return /\bmedley\b/i.test(name) || /\s\/\s/.test(name);
}

/** Split "Am I Evil? (Diamond Head cover)" into its title and original artist. */
export function splitCover(raw: string): { name: string; originalArtist: string | null } {
  const m = raw.match(/^(.*?)\s*\(([^()]+?) cover\)\s*$/i);
  return m ? { name: m[1].trim(), originalArtist: m[2].trim() } : { name: raw.trim(), originalArtist: null };
}
