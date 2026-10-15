import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { colors, radii } from "@/styles/tokens";

const css = readFileSync(join(__dirname, "../../src/app/globals.css"), "utf8");
const rootBlock = css.match(/:root\s*\{([\s\S]*?)\n\}/)?.[1] ?? "";

function cssVar(name: string) {
  return rootBlock.match(new RegExp(`--${name}:\\s*([^;]+);`))?.[1].trim();
}

describe("design tokens", () => {
  it("declares every colour token in globals.css with the same value", () => {
    for (const [name, value] of Object.entries(colors)) {
      expect(cssVar(name)?.toUpperCase(), `--${name}`).toBe(value);
    }
  });

  it("matches the documented defaults", () => {
    expect(colors.higher).toBe("#E4572E");
    expect(colors.lower).toBe("#2B2B30");
    expect(colors["accent-text"]).toBe("#B13E1C");
  });

  it("declares the radii", () => {
    expect(cssVar("r-card")).toBe(`${radii.card}px`);
    expect(cssVar("r-tile")).toBe(`${radii.tile}px`);
    expect(cssVar("r-art")).toBe(`${radii.art}px`);
  });
});
