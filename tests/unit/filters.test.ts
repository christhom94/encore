import { describe, expect, it } from "vitest";
import { excludedReason, isMedley, splitCover } from "@/lib/setlistfm/filters";

describe("excludedReason", () => {
  it.each([
    ["Master of Puppets", null],
    ["Seek & Destroy", null],
    ["Am I Evil?", null],
    ["The Four Horsemen", null],
    ["Solo", "solo"],
    ["Guitar Solo", "solo"],
    ["Drum Solo", "solo"],
    ["Bass Solo", "solo"],
    ["Kirk Hammett Guitar Solo", "solo"],
    ["Jam", "jam"],
    ["Kirk & Rob Jam", "jam"],
    ["Doodle", "jam"],
    ["Intro", "intro"],
    ["Outro", "intro"],
    ["Encore Break", "intro"],
  ])("%s → %s", (name, reason) => {
    expect(excludedReason({ name })).toBe(reason);
  });

  it("excludes tapes regardless of name", () => {
    expect(excludedReason({ name: "The Ecstasy of Gold", isTape: true })).toBe("tape");
  });

  it("keeps songs that merely mention a solo or jam", () => {
    expect(excludedReason({ name: "Solo Flight Into the Long Dark Night" })).toBeNull();
    expect(excludedReason({ name: "Jump in the Fire" })).toBeNull();
    expect(excludedReason({ name: "Ride the Lightning Into the Endless Solo Abyss" })).toBeNull();
  });
});

describe("isMedley", () => {
  it("spots medleys", () => {
    expect(isMedley("Kill/Ride Medley")).toBe(true);
    expect(isMedley("Fade to Black / Master of Puppets")).toBe(true);
    expect(isMedley("Fade to Black")).toBe(false);
    expect(isMedley("AC/DC")).toBe(false);
  });
});

describe("splitCover", () => {
  it("strips the cover suffix and keeps the original artist", () => {
    expect(splitCover("Am I Evil? (Diamond Head cover)")).toEqual({
      name: "Am I Evil?",
      originalArtist: "Diamond Head",
    });
    expect(splitCover("Whiskey in the Jar (Traditional cover)")).toEqual({
      name: "Whiskey in the Jar",
      originalArtist: "Traditional",
    });
    expect(splitCover("One")).toEqual({ name: "One", originalArtist: null });
  });
});
