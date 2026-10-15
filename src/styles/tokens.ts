// Design tokens for the "Headliner" style. Values mirror :root in
// design/prototype/index.html and docs/DESIGN.md. globals.css declares the same
// values as CSS variables; tests/unit/tokens.test.ts keeps the two in sync.

export const colors = {
  bg: "#E3E1DC",
  paper: "#F8F6F2",
  ink: "#1C1C1F",
  muted: "#55555C",
  higher: "#E4572E",
  "on-higher": "#1C1C1F",
  lower: "#2B2B30",
  tile: "#ECE9E3",
  "accent-text": "#B13E1C",
} as const;

export type ColorToken = keyof typeof colors;

export const colorUse: Record<ColorToken, string> = {
  bg: "Page ground (concrete grey)",
  paper: "Cards, light tiles, pills",
  ink: "Text, borders, hard shadows",
  muted: "Secondary text, eyebrows",
  higher: "Higher button, accent tiles. Overridden per song",
  "on-higher": "Text on --higher",
  lower: "Lower button, dark tiles. Never changes",
  tile: "Recessed tiles, progress track",
  "accent-text": "Small accent text on light tiles",
};

export const radii = {
  card: 26,
  hero: 24,
  tile: 20,
  art: 18,
  thumb: 12,
} as const;

export const border = "2.5px";
