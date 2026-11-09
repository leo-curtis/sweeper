# [Sweeper](https://leo-curtis.github.io/sweeper/)

A remake of one of my favorite games, built with React, TypeScript, and PWA.

## Quickstart

```bash
pnpm install
pnpm dev         # http://localhost:5173/sweeper/
pnpm test        # vitest (watch) — use `pnpm test:run` for a single pass
pnpm lint
pnpm type-check
pnpm build       # tsc + vite build → dist/
pnpm preview
```

## How to play

- **Open** a cell: left-click / tap. The first click is always safe.
- **Flag** a suspected mine: right-click, two-finger click, or long-press.
- **Chord** (open everything around a solved number): double-click an open
  number once its flag count matches.
- **Share a board**: 🔗 Share board copies a link carrying the board's seed,
  difficulty and opening cell. The minefield is generated from the seed up
  front, and the recipient starts from the same revealed opening, so they get
  the exact same board.
- **Theme**: 🌙 / ☀️ toggle, persisted, follows the OS on first visit.

## Tech notes

- `src/engine/` is a pure, deterministic game core (seeded xoshiro128+
  shuffle, immutable snapshots). Same seed + same moves ⇒ same board —
  pinned by a fast-check property test.
- PWA icons: `node public/icons/create-icons.js` regenerates
  `public/icons/icon-{192,512}.png` with zero dependencies.
