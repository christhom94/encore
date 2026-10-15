import { describe, expect, it } from "vitest";
import { pickArtist } from "@/lib/setlistfm/api";
import { tallySetlists } from "@/lib/setlistfm/aggregate";
import type { ApiSetlist } from "@/lib/setlistfm/api";

const setlist = (
  id: string,
  ...songs: Array<string | { name: string; tape?: boolean; cover?: string }>
): ApiSetlist => ({
  id,
  eventDate: "01-01-2024",
  sets: {
    set: [
      {
        song: songs.map((s) =>
          typeof s === "string"
            ? { name: s }
            : { name: s.name, tape: s.tape, cover: s.cover ? { name: s.cover } : undefined },
        ),
      },
    ],
  },
});

describe("tallySetlists", () => {
  it("counts songs across setlists, flags tapes and covers, skips empty shows", () => {
    const result = tallySetlists([
      setlist(
        "1",
        { name: "The Ecstasy of Gold", tape: true, cover: "Ennio Morricone" },
        "Creeping Death",
        "One",
      ),
      setlist("2", "Creeping Death", { name: "Am I Evil?", cover: "Diamond Head" }),
      { id: "3", eventDate: "01-01-2024", sets: { set: [] } },
    ]);
    expect(result.totalSetlists).toBe(2);
    expect(result.songs[0]).toMatchObject({ name: "Creeping Death", count: 2, isCover: false });
    expect(result.songs.find((s) => s.name === "Am I Evil?")).toMatchObject({
      isCover: true,
      originalArtist: "Diamond Head",
    });
    expect(result.songs.find((s) => s.name === "The Ecstasy of Gold")).toMatchObject({
      isTape: true,
      count: 1,
    });
  });
});

describe("pickArtist", () => {
  const results = [
    { mbid: "a", name: "Moretallica", disambiguation: "Metallica tribute", url: "" },
    { mbid: "b", name: "Metallica", disambiguation: "tribute band from Ohio", url: "" },
    { mbid: "c", name: "Metallica", disambiguation: null, url: "" },
  ];
  it("prefers an exact name without disambiguation", () => {
    expect(pickArtist(results, "metallica")?.mbid).toBe("c");
  });
  it("falls back to the top result", () => {
    expect(pickArtist(results, "Metalica")?.mbid).toBe("a");
    expect(pickArtist([], "x")).toBeNull();
  });
});
