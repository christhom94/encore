# Design spec: "Headliner"

**Source of truth:** `design/prototype/index.html` (open it in a browser and play). Screenshots at 390×844 are in `design/screens/`. The `.dc.html` files in `design/canvas-source/` are the original design-tool files: they need that tool's runtime and won't open on their own, so use them only to read exact values.

Mood: a rounded gig poster. Flat colours, thick ink outlines, chunky condensed type, hard offset shadows, halftone dots on placeholders. No gradients, no blur, no soft drop shadows.

## Tokens

| Token | Value | Use |
| --- | --- | --- |
| `--bg` | `#E3E1DC` | Page ground (concrete grey) |
| `--paper` | `#F8F6F2` | Cards, light tiles, pills |
| `--ink` | `#1C1C1F` | Text, borders, hard shadows |
| `--muted` | `#55555C` | Secondary text, eyebrows |
| `--higher` | `#E4572E` default | Higher button, accent tiles. **Overridden per song** by the album accent |
| `--on-higher` | `#1C1C1F` default | Text on `--higher` (ink or paper, whichever contrasts more) |
| `--lower` | `#2B2B30` | Lower button, dark tiles, card offset block. Never changes |
| `--tile` | `#ECE9E3` | Recessed tiles, progress track |
| `--accent-text` | `#B13E1C` default | Small accent text on light tiles (derived from the accent, ≥ 4.5:1) |
| Border | 2.5px solid ink | Cards, tiles, buttons |
| Radii | card 26, hero tile 24, tile 20, art 18, thumb 12, pill 999 | |
| `--shadow-hard` | `5px 5px 0 var(--ink)` | The one hero tile per screen |
| `--shadow-card` | `8px 8px 0 var(--lower)` | The top swipe card |

## Type

- **Anton** 400, uppercase, line-height 1: wordmark, headings, song titles, all big numbers, buttons. Sizes in the prototype: hero 60, verdict number 124, line number 80, title 38 (30 if the title is longer than 17 characters), tile numbers 44 to 54, buttons 24, header artist 26.
- **Schibsted Grotesk** 400 to 700: body and labels. Eyebrows are 11px, weight 700, 0.14em tracking, uppercase.
- Numbers use `en-GB` thousands separators (1,803).

## Layout

- Phone-first, 390 wide reference, 16px side padding, 52px top padding (safe area), 22px bottom.
- Bento grid: 2 equal columns, 8px gap. Wide tiles span both columns.
- On desktop, centre the phone-width layout; don't stretch it.

## Screens

1. **Home** (`01-home.png`): wordmark + help button; "Higher or lower?" hero with "Higher" in the accent colour; search pill; "Popular now" bento: hero artist tile (accent colour, hard shadow, setlist count, Play chip, greyscale photo), photo tiles with a paper name sticker and play dot, best streak tile (dark), daily encore tile (dashed border).
2. **Play** (`02-play.png`): header (back, song number, artist, streak chip); card stack with the next card underneath and the top card in front with an 8px charcoal offset block; cover art, title, album · year, preview control with progress bar, line box ("Played live more or less than" / number / "Times?"); Lower and Higher pill buttons; hint; credit.
3. **Swiping** (`03-swiping-right.png`): card follows the finger and rotates; "Higher" stamp (accent, ink border, -13°) or "Lower" stamp (charcoal, +13°) fades in; the matching button lifts with a hard shadow and the other dims.
4. **Reveal** (`04-reveal.png`): streak chip turns accent when correct; song strip; hero verdict tile in the accent colour ("Correct. Higher it is.") with the real count, or charcoal with an accent shadow when wrong ("Nope. It was lower."); tiles for Your line, Over/Under by, Played at %, All-time rank; "Next song" or "See your run".
5. **Game over** (`05-game-over.png`): dark hero tile with the streak in the accent colour; Your best; Fan level (accent tile); "The one that got you"; Your run (last 6 covers with tick and cross badges); Play again, Share streak, New band.
6. **Accent examples:** `06-play-album-colour-green.png` (…And Justice for All gives green) and `07-play-album-colour-fallback.png` (the Black Album has no colour, so the default red is used).

## Album accent theming

- Applies on Play and Reveal only; Home and Game over use the default red.
- Elements that use it: Higher button, Higher stamp, progress bar fill, streak chip when hot, the verdict tile when correct, the Over/Under number and the "Times?" label (via `--accent-text`).
- Lower is always charcoal so the two choices stay distinct whatever the cover.

## Motion

- Drag: translate x, rotate `x / 18` degrees around a point below the card (`transform-origin: 50% 110%`).
- Commit threshold 90px; fly-out to ±620px over 300ms with `cubic-bezier(.2,.7,.3,1)`; spring back if under the threshold.
- Buttons lift `translate(-3px, -3px)` with a 4px ink shadow when armed.
- With `prefers-reduced-motion`: no rotation or fly animation, just switch screens.

## Imagery

- Covers: full colour, 18px radius on the card, 12px on thumbnails.
- Band photos: `filter: grayscale(1) contrast(1.1)`, cropped with `object-fit: cover`.
- Missing cover: charcoal tile with paper halftone dots (`radial-gradient` 1.4px dots on an 8px grid).

## Copy

Short and punchy, uppercase in Anton. Examples: "Higher or lower?", "Played live more or less than", "Times?", "Correct. Higher it is.", "Nope. It was lower.", "Game over.", "Setlist cleared.", "The one that got you", "Your run", "Play Metallica again".

## Accessibility

- Text contrast ≥ 4.5:1 (3:1 for 24px+ display text). Accent text colours are computed, not hard-coded.
- Touch targets ≥ 44px. Real `<button>` elements. Keyboard: left and right arrows guess, Enter on the result moves on.
- Announce results with `aria-live`. Cover images have alt text; decorative images use empty alt.
