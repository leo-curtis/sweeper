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
