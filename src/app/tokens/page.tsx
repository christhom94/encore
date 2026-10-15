import type { Metadata } from "next";
import { colors, colorUse, radii, type ColorToken } from "@/styles/tokens";

export const metadata: Metadata = { title: "Encore · Design tokens" };

const DARK_GROUNDS: ColorToken[] = ["ink", "on-higher", "muted", "lower", "accent-text"];

const displaySizes = [
  { px: 124, label: "Verdict number", sample: "1,803" },
  { px: 80, label: "Line number", sample: "1,500" },
  { px: 60, label: "Hero", sample: "Higher" },
  { px: 38, label: "Song title", sample: "Master of Puppets" },
  { px: 26, label: "Header artist", sample: "Metallica" },
  { px: 24, label: "Buttons", sample: "Lower · Higher" },
];

const bodyWeights = [400, 500, 600, 700] as const;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="eyebrow text-muted">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export default function TokensPage() {
  return (
    <main className="mx-auto max-w-[390px] px-4 pt-[52px] pb-[22px]">
      <div className="display text-[34px] tracking-[.02em]">
        Encore<span className="text-higher">.</span>
      </div>
      <h1 className="mt-3.5 display text-[60px] leading-[.95]">
        <span className="text-higher">Design</span>
        <br />
        tokens
      </h1>
      <p className="mt-2.5 text-base leading-snug font-medium text-muted">
        Stage 0 check: colours, radii, shadows and both self-hosted fonts.
      </p>

      <Section title="Colours">
        <ul className="grid grid-cols-2 gap-2">
          {(Object.keys(colors) as ColorToken[]).map((name) => (
            <li
              key={name}
              data-token={name}
              className="flex min-h-[104px] flex-col justify-between rounded-tile px-3.5 py-3 border-poster"
              style={{
                background: `var(--${name})`,
                color: DARK_GROUNDS.includes(name) ? "var(--paper)" : "var(--ink)",
              }}
            >
              <span className="eyebrow">--{name}</span>
              <span>
                <span className="block display text-[26px]">{colors[name]}</span>
                <span className="text-[11px] leading-tight font-semibold">{colorUse[name]}</span>
              </span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Radii · 2.5px ink border">
        <div className="flex flex-wrap items-end gap-2">
          {Object.entries(radii).map(([name, px]) => (
            <div key={name} className="flex flex-col items-center gap-1.5">
              <div className="size-[72px] bg-paper border-poster" style={{ borderRadius: px }} />
              <span className="text-[11px] font-bold">
                {name} {px}
              </span>
            </div>
          ))}
          <div className="flex flex-col items-center gap-1.5">
            <div className="flex h-11 w-[72px] items-center justify-center rounded-pill bg-paper eyebrow border-poster">
              Pill
            </div>
            <span className="text-[11px] font-bold">pill 999</span>
          </div>
        </div>
      </Section>

      <Section title="Shadows">
        <div className="grid grid-cols-2 gap-4 pr-2">
          <div className="flex min-h-[104px] flex-col justify-between rounded-hero bg-higher px-3.5 py-3 text-on-higher shadow-hard border-poster">
            <span className="eyebrow">--shadow-hard</span>
            <span className="display text-[24px]">Hero tile</span>
          </div>
          <div className="flex min-h-[104px] flex-col justify-between rounded-card bg-paper px-3.5 py-3 shadow-card border-poster">
            <span className="eyebrow">--shadow-card</span>
            <span className="display text-[24px]">Top card</span>
          </div>
        </div>
      </Section>

      <Section title="Halftone placeholder">
        <div className="flex h-[120px] items-center justify-center rounded-art halftone-dark eyebrow text-paper">
          Cover art
        </div>
      </Section>

      <Section title="Anton 400 · display">
        <div className="flex flex-col gap-3">
          {displaySizes.map(({ px, label, sample }) => (
            <div key={px}>
              <span className="eyebrow text-muted">
                {px}px · {label}
              </span>
              <div className="overflow-hidden display whitespace-nowrap" style={{ fontSize: px }}>
                {sample}
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Schibsted Grotesk · body">
        <div className="flex flex-col gap-2">
          {bodyWeights.map((w) => (
            <p key={w} className="m-0 text-base" style={{ fontWeight: w }}>
              {w} · Guess how many times a band has played each song live.
            </p>
          ))}
          <span className="eyebrow">Eyebrow · 11px 700 · 0.14em</span>
          <span className="eyebrow text-accent-text">Accent text · Daily encore</span>
        </div>
      </Section>

      <footer className="mt-10 text-center text-[11px] font-semibold tracking-[.08em] text-muted uppercase">
        Counts from{" "}
        <a className="underline" href="https://www.setlist.fm" target="_blank" rel="noopener">
          setlist.fm
        </a>
      </footer>
    </main>
  );
}
