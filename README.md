# sweeper

A remake of one of my favorite games, built with React, TypeScript, and PWA.

**[Play now](https://leo-curtis.github.io/sweeper/)** → https://leo-curtis.github.io/sweeper/

## Quickstart

```bash
npm install
npm run dev      # http://localhost:5173/sweeper/
npm run test     # vitest (watch) — use `npx vitest run` for a single pass
npm run lint
npm run type-check
npm run build    # tsc + vite build → dist/
npm run preview
```

## How to play

- **Open** a cell: left-click / tap. The first click is always safe.
- **Flag** a suspected mine: right-click, two-finger click, or long-press.
- **Chord** (open everything around a solved number): double-click an open
  number once its flag count matches.
- **Share a board**: 🔗 Share board copies a link carrying the board's
  seed + difficulty, so the exact layout rebuilds for anyone opening it.
- **Theme**: 🌙 / ☀️ toggle, persisted, follows the OS on first visit.

## Tech notes

- `src/engine/` is a pure, deterministic game core (seeded xoshiro128+
  shuffle, immutable snapshots). Same seed + same moves ⇒ same board —
  pinned by a fast-check property test.
- PWA icons: `node public/icons/create-icons.js` regenerates
  `public/icons/icon-{192,512}.png` with zero dependencies.
