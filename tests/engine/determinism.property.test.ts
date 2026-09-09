import fc from "fast-check";
import { expect, it } from "vitest";
import { createGame } from "../../src/engine";

it("determinism: same seed + moves => identical final snapshot", async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.hexaString({ minLength: 32, maxLength: 32 }),
      fc.integer({ min: 5, max: 8 }),
      fc.integer({ min: 5, max: 8 }),
      fc.integer({ min: 1, max: 10 }),
      fc.array(fc.tuple(fc.integer({ min: 0, max: 7 }), fc.integer({ min: 0, max: 7 })), { minLength: 1, maxLength: 20 }),
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
        const g1 = createGame({ seed, settings, createdAt: 0 });
        const g2 = createGame({ seed, settings, createdAt: 0 });
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
