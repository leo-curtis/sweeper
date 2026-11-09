import { GameSettings } from "./types";
import { xoshiro128plus } from "./prng";

export interface MutableCell {
  x: number;
  y: number;
  isMine: boolean;
  isOpen: boolean;
  isFlagged: boolean;
  adjacent: number;
}

export function createEmptyBoard(width: number, height: number): MutableCell[][] {
  const board: MutableCell[][] = [];
  for (let y = 0; y < height; y++) {
    const row: MutableCell[] = [];
    for (let x = 0; x < width; x++) {
      row.push({ x, y, isMine: false, isOpen: false, isFlagged: false, adjacent: 0 });
    }
    board.push(row);
  }
  return board;
}

function inBounds(w: number, h: number, x: number, y: number) {
  return x >= 0 && y >= 0 && x < w && y < h;
}

const NEIGHBORS = [
  [-1, -1],
  [0, -1],
  [1, -1],
  [-1, 0],
  [1, 0],
  [-1, 1],
  [0, 1],
  [1, 1],
];

export function computeAdjacents(board: MutableCell[][]) {
  const h = board.length;
  const w = board[0]?.length ?? 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let count = 0;
      for (const [dx, dy] of NEIGHBORS) {
        const nx = x + dx!,
          ny = y + dy!;
        if (inBounds(w, h, nx, ny) && (board[ny]?.[nx]?.isMine ?? false)) count++;
      }
      if (board[y]!) {
        board[y]![x]!.adjacent = count;
      }
    }
  }
}

export function placeMines(
  board: MutableCell[][],
  settings: GameSettings,
  exclude: Set<string>,
  seedState: [number, number, number, number]
) {
  const w = settings.width,
    h = settings.height,
    mines = settings.mines;
  const rng = xoshiro128plus(seedState);
  const positions: { x: number; y: number }[] = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const key = `${x},${y}`;
      if (!exclude.has(key)) positions.push({ x, y });
    }
  }
  // shuffle positions deterministically then take first mines
  rng.shuffle(positions);
  const chosen = positions.slice(0, mines);
  for (const p of chosen) {
    const cell = board[p.y]?.[p.x];
    if (cell) {
      cell.isMine = true;
    }
  }
  computeAdjacents(board);
}

/**
 * Mines are placed from the seed when the game is created, so the same seed
 * always describes the same minefield. To keep the first click safe we move
 * any mines that landed in its 3x3 opening area to deterministic empty cells.
 * Relocation uses a fresh RNG stream seeded by the same seed, so it depends
 * only on the seed and the opening area — never on wall-clock randomness or
 * on the player's flags.
 */
export function ensureSafeZone(
  board: MutableCell[][],
  settings: GameSettings,
  seedState: [number, number, number, number],
  safeX: number,
  safeY: number
) {
  const { width: w, height: h } = settings;
  const safe = new Set<string>();
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const nx = safeX + dx,
        ny = safeY + dy;
      if (inBounds(w, h, nx, ny)) safe.add(`${nx},${ny}`);
    }
  }

  const stranded: Array<{ x: number; y: number }> = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (safe.has(`${x},${y}`) && (board[y]?.[x]?.isMine ?? false)) {
        stranded.push({ x, y });
      }
    }
  }
  if (stranded.length === 0) return [];

  const candidates: Array<{ x: number; y: number }> = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const cell = board[y]?.[x];
      if (!cell || cell.isMine || safe.has(`${x},${y}`)) continue;
      candidates.push({ x, y });
    }
  }

  const rng = xoshiro128plus(seedState);
  rng.shuffle(candidates);

  const moved: Array<{ from: { x: number; y: number }; to: { x: number; y: number } }> = [];
  for (const from of stranded) {
    const to = candidates.pop();
    if (!to) break; // Board too small to keep the whole opening area safe.
    const fromCell = board[from.y]?.[from.x];
    const toCell = board[to.y]?.[to.x];
    if (!fromCell || !toCell) continue;
    fromCell.isMine = false;
    toCell.isMine = true;
    moved.push({ from, to });
  }
  if (moved.length > 0) computeAdjacents(board);
  return moved;
}

export function floodFillReveal(board: MutableCell[][], sx: number, sy: number) {
  const h = board.length;
  const w = board[0]?.length ?? 0;
  if (!inBounds(w, h, sx, sy)) return [];
  const stack: Array<{ x: number; y: number }> = [{ x: sx, y: sy }];
  const changed: Array<{ x: number; y: number }> = [];
  while (stack.length) {
    const { x, y } = stack.pop()!;
    const cell = board[y]?.[x];
    if (!cell || cell.isOpen || cell.isFlagged) continue;
    cell.isOpen = true;
    changed.push({ x, y });
    if (cell.adjacent === 0 && !cell.isMine) {
      for (const [dx, dy] of NEIGHBORS) {
        const nx = x + dx!,
          ny = y + dy!;
        if (inBounds(w, h, nx, ny)) {
          const neighbor = board[ny]?.[nx];
          if (neighbor && !neighbor.isOpen && !neighbor.isFlagged) stack.push({ x: nx, y: ny });
        }
      }
    }
  }
  return changed;
}
