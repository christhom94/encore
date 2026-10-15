import { describe, expect, it } from "vitest";
import { prepareSongs } from "@/ingest/prepare";

describe("prepareSongs", () => {
  const rows = prepareSongs({
    totalSetlists: 100,
    songs: [
      { name: "Master of Puppets", count: 90, isCover: false, originalArtist: null },
      { name: "Am I Evil? (Diamond Head cover)", count: 40, isCover: true, originalArtist: null },
      { name: "Guitar Solo", count: 80, isCover: false, originalArtist: null },
      { name: "Creeping Death", count: 70, isCover: false, originalArtist: null },
      { name: "One", count: 70, isCover: false, originalArtist: null },
      {
        name: "The Ecstasy of Gold",
        count: 95,
        isCover: true,
        originalArtist: "Ennio Morricone",
        isTape: true,
      },
      { name: "Kill/Ride Medley", count: 12, isCover: false, originalArtist: null },
    ],
  });
  const byName = Object.fromEntries(rows.map((r) => [r.displayName, r]));

  it("ranks kept songs by count, ties sharing a rank", () => {
    expect(byName["Master of Puppets"].rank).toBe(1);
    expect(byName["Creeping Death"].rank).toBe(2);
    expect(byName["One"].rank).toBe(2);
    expect(byName["Am I Evil?"].rank).toBe(4);
    expect(byName["Kill/Ride Medley"].rank).toBe(5);
  });

  it("keeps covers without the suffix, with the original artist", () => {
    expect(byName["Am I Evil?"]).toMatchObject({
      isCover: true,
      originalArtist: "Diamond Head",
      excludedReason: null,
    });
  });

  it("keeps medleys and flags them", () => {
    expect(byName["Kill/Ride Medley"]).toMatchObject({ isMedley: true, excludedReason: null });
  });

  it("excludes solos and tapes without ranking them", () => {
    expect(byName["Guitar Solo"]).toMatchObject({ excludedReason: "solo", rank: null });
    expect(byName["The Ecstasy of Gold"]).toMatchObject({ excludedReason: "tape", rank: null });
  });
});
