import { describe, expect, it } from "vitest";
import { fmt, levelFor, playedAtPercent } from "@/game/stats";

describe("levelFor", () => {
  it.each([
    [0, "Crowd", "3 more for Roadie"],
    [2, "Crowd", "1 more for Roadie"],
    [3, "Roadie", "5 more for Tour manager"],
    [5, "Roadie", "3 more for Tour manager"],
    [7, "Roadie", "1 more for Tour manager"],
    [8, "Tour manager", "4 more for Headliner"],
    [11, "Tour manager", "1 more for Headliner"],
    [12, "Headliner", "Top of the bill"],
    [40, "Headliner", "Top of the bill"],
  ])("streak %i is %s", (n, level, next) => {
    expect(levelFor(n)).toEqual({ level, next });
  });
});

describe("playedAtPercent", () => {
  it("rounds and caps at 100", () => {
    expect(playedAtPercent(1803, 2198)).toBe(82);
    expect(playedAtPercent(2500, 2198)).toBe(100);
    expect(playedAtPercent(5, 0)).toBe(0);
  });
});

describe("fmt", () => {
  it("uses en-GB separators", () => {
    expect(fmt(1803)).toBe("1,803");
    expect(fmt(12)).toBe("12");
  });
});
