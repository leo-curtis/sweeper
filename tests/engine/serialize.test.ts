import { describe, it, expect } from "vitest";
import { createGame, deserializeToEngine } from "../../src/engine";

const SEED = "a83f9c12e7b40155d92fa8ce31b70a44";

describe("serialize", () => {
  it("round-trips seed, settings and moves into an identical snapshot", () => {
    const game = createGame({
      seed: SEED,
      settings: { difficulty: "beginner", width: 9, height: 9, mines: 10 },
      createdAt: 0,
    });
    game.openCellAt(4, 4, 1);
    game.toggleFlagAt(0, 0, 2);
    const restored = deserializeToEngine(game.serialize());
    expect(JSON.stringify(restored.getSnapshot())).toBe(JSON.stringify(game.getSnapshot()));
  });

  it("round-trips a shared opening back into the identical board", () => {
    const game = createGame({
      seed: SEED,
      settings: { difficulty: "beginner", width: 9, height: 9, mines: 10 },
      createdAt: 0,
      opening: { x: 4, y: 4 },
    });
    expect(JSON.parse(game.serialize()).opening).toEqual({ x: 4, y: 4 });

    const restored = deserializeToEngine(game.serialize());
    expect(restored.getSnapshot().opening).toEqual({ x: 4, y: 4 });
    expect(JSON.stringify(restored.getSnapshot())).toBe(JSON.stringify(game.getSnapshot()));
  });

  it("rejects payloads missing engineVersion, seed or settings", () => {
    expect(() => deserializeToEngine("{}")).toThrow("Invalid serialization");
  });
});
