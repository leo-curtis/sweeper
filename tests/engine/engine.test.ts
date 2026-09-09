import { describe, it, expect } from "vitest";
import { createGame } from "../../src/engine";

const SEED = "a83f9c12e7b40155d92fa8ce31b70a44";

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
});
