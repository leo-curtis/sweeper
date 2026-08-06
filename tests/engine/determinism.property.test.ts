import fc from "fast-check";
import { expect, it } from "vitest";
import { createGame } from "../../src/engine";

it("determinism: same seed + moves => identical final snapshot", async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.hexaString(32),
      fc.integer(5, 8),
      fc.integer(5, 8),
      fc.integer(1, 10),
      fc.array(fc.tuple(fc.integer(0, 7), fc.integer(0, 7)), 1, 20),
      async (seed, w, h, mines, coords) => {
        // clamp mines
        const minesClamped = Math.min(mines, w * h - 1);
        // normalize coords to board
        const movesCoords = coords.map(([x, y]) => [x % w, y % h] as const);
        const settings = {
          difficulty: "custom" as const,
          width: w,
          height: h,
          mines: minesClamped,
        };
        const g1 = createGame({ seed, settings });
        const g2 = createGame({ seed, settings });
        // apply opens only for determinism test
        let seq = 1;
        for (const [x, y] of movesCoords) {
          g1.openCellAt(x, y, seq);
          g2.openCellAt(x, y, seq);
          seq++;
        }
        const s1 = g1.getSnapshot();
        const s2 = g2.getSnapshot();
        // compare serialized snapshots (serialize uses moves as well)
        expect(JSON.stringify(s1)).toBe(JSON.stringify(s2));
        return true;
      }
    ),
    { numRuns: 50 }
  );
});
