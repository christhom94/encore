# Encore: handover pack for Claude Code

Everything Claude Code needs to build Encore, the setlist.fm higher or lower game.

## What's inside

| Path | What it is |
| --- | --- |
| `CLAUDE.md` | The project brief. Claude Code reads this automatically every session. |
| `docs/BUILD_PLAN.md` | Seven stages (0 to 6), each with a clear "done when". |
| `docs/DESIGN.md` | Colours, type, layout, screens, motion and the album-colour rules. |
| `docs/DATA.md` | setlist.fm stats pages, Deezer, matching rules, schema. |
| `design/prototype/index.html` | Playable prototype. Open it in a browser. This is the target look and feel. |
| `design/screens/` | Screenshots of every screen at phone size. |
| `design/canvas-source/` | The original design files, for exact values only. |
| `.env.example` | The settings the app needs. |

## How to start

1. Unzip this into a new folder, for example `encore`.
2. Get a free setlist.fm API key (log in to setlist.fm, go to your account settings, then API).
3. Copy `.env.example` to `.env.local` and fill in your key and email address.
4. Open a terminal in the folder and run `claude`.
5. Paste this as your first message:

> Read CLAUDE.md, then docs/BUILD_PLAN.md, docs/DESIGN.md and docs/DATA.md. Open design/prototype/index.html and the screenshots in design/screens so you know the target. Then start Stage 0. Stop at the end of each stage and summarise so I can review before you continue.

6. After each stage, check the result. Say "continue to Stage 1" (and so on) when you're happy.

## Notes

- You need Node 20 or newer installed.
- The album covers and band photos in `design/prototype/assets/` are for the prototype only. The real app pulls covers and artist photos from Deezer.
- Before going public, check setlist.fm's terms about using their stats pages (see `docs/DATA.md`, section 2).
