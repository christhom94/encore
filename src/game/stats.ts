export type FanLevel = "Crowd" | "Roadie" | "Tour manager" | "Headliner";

/** Fan level by streak: Crowd 0–2, Roadie 3–7, Tour manager 8–11, Headliner 12+. */
export function levelFor(streak: number): { level: FanLevel; next: string } {
  if (streak < 3) return { level: "Crowd", next: `${3 - streak} more for Roadie` };
  if (streak < 8) return { level: "Roadie", next: `${8 - streak} more for Tour manager` };
  if (streak < 12) return { level: "Tour manager", next: `${12 - streak} more for Headliner` };
  return { level: "Headliner", next: "Top of the bill" };
}

/** "Played at" percentage of all setlists, capped at 100. */
export function playedAtPercent(count: number, totalSetlists: number): number {
  if (totalSetlists <= 0) return 0;
  return Math.min(100, Math.round((count / totalSetlists) * 100));
}

/** Numbers with en-GB thousands separators (1,803). */
export const fmt = (n: number) => n.toLocaleString("en-GB");
