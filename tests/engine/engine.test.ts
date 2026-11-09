import { describe, it, expect } from "vitest";
import { Board, createGame } from "../../src/engine";

const SEED = "a83f9c12e7b40155d92fa8ce31b70a44";
const BEGINNER = { difficulty: "beginner" as const, width: 9, height: 9, mines: 10 };

function minePositions(board: Board): string[] {
  const found: string[] = [];
  for (let y = 0; y < board.length; y++) {
    for (let x = 0; x < (board[y]?.length ?? 0); x++) {
      if (board[y]?.[x]?.isMine) found.push(`${x},${y}`);
    }
  }
  return found;
}

function layout(board: Board): string[] {
  return board.map((row) => row.map((c) => `${c.isMine ? "m" : "."}${c.adjacent}`).join("|"));
}

function openingIsSafe(board: Board, cx: number, cy: number): boolean {
  const width = board[0]?.length ?? 0;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const x = cx + dx;
      const y = cy + dy;
      if (x >= 0 && y >= 0 && x < width && y < board.length && board[y]?.[x]?.isMine) {
        return false;
      }
    }
  }
  return true;
}

describe("engine basic behavior", () => {
  it("ensures immutable snapshots (cloneSnapshot test)", () => {
    const game = createGame({
      seed: SEED,
      settings: { difficulty: "beginner", width: 9, height: 9, mines: 10 },
    });
    const snap1 = game.getSnapshot();
    // attempt to mutate snapshot; it should not affect engine
    try {
      // @ts-expect-error mutate intentionally to prove snapshots are detached
      snap1.board[0]![0]!.isOpen = true;
    } catch {
      // assignment throws because snapshots are deep-frozen
    }
    const snap2 = game.getSnapshot();
    expect(snap2.board[0]?.[0]?.isOpen).toBe(false);
  });

  it("first click is safe (no mines in clicked cell or neighbors)", () => {
    const game = createGame({
      seed: SEED,
      settings: { difficulty: "beginner", width: 9, height: 9, mines: 10 },
    });
    const centerX = 4,
      centerY = 4;
    const snap = game.openCellAt(centerX, centerY);
    // check clicked cell and neighbors contain no mine
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const x = centerX + dx,
          y = centerY + dy;
        if (x >= 0 && y >= 0 && x < 9 && y < 9) {
          expect(snap.board[y]?.[x]?.isMine).toBe(false);
        }
      }
    }
  });

  it("a shared opening rebuilds the exact board, including safety relocations", () => {
    for (let y = 0; y < BEGINNER.height; y++) {
      for (let x = 0; x < BEGINNER.width; x++) {
        // The sharer opens the cell normally...
        const direct = createGame({ seed: SEED, settings: BEGINNER });
        const directSnap = direct.openCellAt(x, y);
        expect(directSnap.opening).toEqual({ x, y });
        expect(openingIsSafe(directSnap.board, x, y)).toBe(true);

        // ...and the recipient loads the seed + opening from the shared link.
        const shared = createGame({
          seed: SEED,
          settings: BEGINNER,
          opening: directSnap.opening,
        });
        const sharedSnap = shared.getSnapshot();

        expect(layout(sharedSnap.board)).toEqual(layout(directSnap.board));
        expect(minePositions(sharedSnap.board)).toEqual(minePositions(directSnap.board));
        expect(minePositions(sharedSnap.board)).toHaveLength(BEGINNER.mines);
        expect(sharedSnap.opening).toEqual({ x, y });
        expect(sharedSnap.status).toBe(directSnap.status);
        expect(sharedSnap.board[y]?.[x]?.isOpen).toBe(true);
      }
    }
  });

  it("pre-applies a shared opening without recording a move", () => {
    const shared = createGame({ seed: SEED, settings: BEGINNER, opening: { x: 4, y: 4 } });
    const snap = shared.getSnapshot();

    expect(snap.status).toBe("playing");
    expect(snap.movesCount).toBe(0);
    expect(snap.opening).toEqual({ x: 4, y: 4 });
    expect(snap.board[4]?.[4]?.isOpen).toBe(true);
    expect(openingIsSafe(snap.board, 4, 4)).toBe(true);
  });

  it("ignores an out-of-bounds or malformed opening", () => {
    const baseline = createGame({ seed: SEED, settings: BEGINNER }).getSnapshot();

    for (const opening of [
      { x: -1, y: 0 },
      { x: 0, y: -1 },
      { x: BEGINNER.width, y: 0 },
      { x: 0, y: BEGINNER.height },
      { x: 1.5, y: 2 },
    ]) {
      const snap = createGame({ seed: SEED, settings: BEGINNER, opening }).getSnapshot();
      expect(snap.opening).toBeUndefined();
      expect(snap.status).toBe("idle");
      expect(layout(snap.board)).toEqual(layout(baseline.board));
    }
  });

  it("first click relocates mines out of its 3x3 opening area", () => {
    const game = createGame({ seed: SEED, settings: BEGINNER });
    const initial = game.getSnapshot().board;
    const width = initial[0]?.length ?? 0;

    let target: { x: number; y: number } | undefined;
    for (let y = 0; y < initial.length && !target; y++) {
      for (let x = 0; x < width && !target; x++) {
        if (!openingIsSafe(initial, x, y)) target = { x, y };
      }
    }
    expect(target).toBeDefined();

    const before = minePositions(initial);
    const snap = game.openCellAt(target!.x, target!.y);

    expect(snap.status).toBe("playing");
    expect(openingIsSafe(snap.board, target!.x, target!.y)).toBe(true);
    expect(snap.board[target!.y]?.[target!.x]?.isOpen).toBe(true);
    expect(minePositions(snap.board)).toHaveLength(before.length);
    expect(minePositions(snap.board)).not.toEqual(before);
  });
});
