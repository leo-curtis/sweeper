import { describe, it, expect } from "vitest";
import { createEmptyBoard, placeMines } from "../../src/engine/generator";
import { seedToState } from "../../src/engine/prng";
import type { GameSettings } from "../../src/engine/types";

describe("generator", () => {
  it("places correct number of mines and computes adjacent counts", () => {
    const settings: GameSettings = {
      difficulty: "custom",
      width: 8,
      height: 8,
      mines: 10,
    };
    const seed = "a83f9c12e7b40155d92fa8ce31b70a44";
    const state = seedToState(seed);
    const board = createEmptyBoard(settings.width, settings.height);
    // exclude nothing
    placeMines(board, settings, new Set<string>(), state);
    let mineCount = 0;
    for (let y = 0; y < settings.height; y++) {
      for (let x = 0; x < settings.width; x++) {
        if (board[y]?.[x]?.isMine) mineCount++;
        // adjacency in 0..8
        expect(board[y]?.[x]?.adjacent).toBeGreaterThanOrEqual(0);
        expect(board[y]?.[x]?.adjacent).toBeLessThanOrEqual(8);
      }
    }
    expect(mineCount).toBe(settings.mines);
  });
});
