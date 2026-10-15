import { describe, expect, it } from "vitest";
import {
  contrast,
  DEFAULT_ACCENT,
  hexToRgb,
  hslToRgb,
  INK,
  PAPER,
  rgbToHex,
  rgbToHsl,
  themeFor,
  TILE,
} from "@/lib/color";

describe("colour helpers", () => {
  it("round-trips hex, rgb and hsl", () => {
    for (const hex of ["#E4572E", "#DA621B", "#CFDB94", "#2B2B30", "#F8F6F2"]) {
      expect(rgbToHex(hslToRgb(rgbToHsl(hexToRgb(hex))))).toBe(hex);
    }
  });

  it("computes WCAG contrast", () => {
    expect(contrast("#000000", "#FFFFFF")).toBeCloseTo(21, 5);
    expect(contrast(INK, PAPER)).toBeGreaterThan(15);
  });
});

describe("themeFor", () => {
  // The prototype applies themeFor(null) on every screen, so its default accent
  // text renders as #BC3D18 (the static CSS token #B13E1C is only the pre-JS value).
  it("falls back to the default red", () => {
    expect(themeFor(null)).toEqual({
      "--higher": DEFAULT_ACCENT,
      "--on-higher": INK,
      "--accent-text": "#BC3D18",
    });
  });

  it.each(["#DA621B", "#CFDB94", DEFAULT_ACCENT, "#3355EE", "#FFEE00"])(
    "keeps text readable for %s",
    (accent) => {
      const t = themeFor(accent);
      expect(t["--higher"]).toBe(accent);
      expect([INK, PAPER]).toContain(t["--on-higher"]);
      expect(contrast(t["--on-higher"], accent)).toBe(
        Math.max(contrast(accent, INK), contrast(accent, PAPER)),
      );
      expect(contrast(t["--accent-text"], TILE)).toBeGreaterThanOrEqual(4.5);
    },
  );

  it("darkens the green accent for small text", () => {
    const t = themeFor("#CFDB94");
    expect(t["--on-higher"]).toBe(INK);
    expect(t["--accent-text"]).not.toBe("#CFDB94");
  });
});
