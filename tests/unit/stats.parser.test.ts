import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseStatsPage, StatsPageError, statsUrlFor } from "@/lib/setlistfm/stats";

// A saved copy of https://www.setlist.fm/stats/metallica-3bd680c8.html (October 2026).
// Assertions check structure and plausibility rather than exact numbers, so
// the test still passes when the fixture is refreshed.
const html = readFileSync(join(__dirname, "../fixtures/metallica-stats.html"), "utf8");
const result = parseStatsPage(html);
const byName = new Map(result.songs.map((s) => [s.name, s]));

describe("statsUrlFor", () => {
  it("swaps /setlists/ for /stats/", () => {
    expect(statsUrlFor("https://www.setlist.fm/setlists/metallica-3bd680c8.html")).toBe(
      "https://www.setlist.fm/stats/metallica-3bd680c8.html",
    );
  });
});

describe("parseStatsPage (Metallica fixture)", () => {
  it("reads the total number of setlists", () => {
    expect(result.totalSetlists).toBeGreaterThan(2000); // 2198 when saved
  });

  it("reads every song row with a positive count, most played first", () => {
    expect(result.songs.length).toBeGreaterThan(150); // 206 when saved
    for (const s of result.songs) {
      expect(s.name.length).toBeGreaterThan(0);
      expect(Number.isInteger(s.count) && s.count > 0).toBe(true);
    }
    const counts = result.songs.map((s) => s.count);
    expect(counts).toEqual([...counts].sort((a, b) => b - a));
    expect(result.songs[0].name).toBe("Master of Puppets");
  });

  it("has the well-known songs with plausible counts", () => {
    for (const name of [
      "Master of Puppets",
      "Creeping Death",
      "Seek & Destroy",
      "For Whom the Bell Tolls",
      "One",
      "Enter Sandman",
      "Sad but True",
    ]) {
      const song = byName.get(name);
      expect(song, name).toBeDefined();
      expect(song!.count).toBeGreaterThan(1000);
      expect(song!.count).toBeLessThanOrEqual(result.totalSetlists);
      expect(song!.isCover).toBe(false);
    }
    expect(byName.get("Master of Puppets")!.count).toBeGreaterThan(byName.get("Enter Sandman")!.count);
  });

  it("marks covers with the original artist and no suffix in the name", () => {
    expect(byName.get("Am I Evil?")).toMatchObject({ isCover: true, originalArtist: "Diamond Head" });
    expect(byName.get("Last Caress")).toMatchObject({ isCover: true, originalArtist: "Misfits" });
    expect(result.songs.some((s) => /\bcover\)/i.test(s.name))).toBe(false);
  });

  it("keeps non-song rows for the filters to judge (solos, doodles)", () => {
    expect(byName.has("Guitar Solo")).toBe(true);
    expect(byName.has("Kirk and Rob Doodle")).toBe(true);
  });

  it("rejects a page without the song table", () => {
    expect(() => parseStatsPage("<html><body>Nope</body></html>")).toThrow(StatsPageError);
  });
});
