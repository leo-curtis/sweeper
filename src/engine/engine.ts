import {
  Seed,
  GameSettings,
  GameSnapshot,
  GameStatus,
  Move,
  GameEngine,
  Cell,
} from "./types";
import {
  createEmptyBoard,
  placeMines,
  floodFillReveal,
  MutableCell,
} from "./generator";
import { seedToState, validateSeed } from "./prng";
import { serializeEngine, deserializeEngine } from "./serialize";

function deepFreeze<T>(obj: T): T {
  if (obj && typeof obj === "object") {
    Object.freeze(obj);
    const record = obj as Record<string, unknown>;
    for (const k of Object.keys(record)) {
      const v = record[k];
      if (v && typeof v === "object" && !Object.isFrozen(v)) deepFreeze(v);
    }
  }
  return obj;
}

function cellToPublic(c: MutableCell): Cell {
  return {
    x: c.x,
    y: c.y,
    isMine: c.isMine,
    isOpen: c.isOpen,
    isFlagged: c.isFlagged,
    adjacent: c.adjacent,
  };
}

function boardToPublic(board: MutableCell[][]) {
  return board.map((row) => row.map(cellToPublic));
}

export function createGame(params: {
  seed: Seed;
  settings: GameSettings;
  createdAt?: number;
}): GameEngine {
  validateSeed(params.seed);
  const engineVersion = "1.0";
  const createdAt = params.createdAt ?? Date.now();

  let seedState = seedToState(params.seed);

  let board: MutableCell[][] = createEmptyBoard(params.settings.width, params.settings.height);
  let minesPlaced = false;
  let status: GameStatus = "idle";
  let moves: Move[] = [];
  let openedCount = 0;
  let flaggedCount = 0;

  function computeSnapshot(): GameSnapshot {
    const boardPublic = boardToPublic(board);
    const snapshot: GameSnapshot = deepFreeze({
      engineVersion,
      seed: params.seed,
      settings: params.settings,
      board: boardPublic,
      status,
      movesCount: moves.length,
      openedCount,
      flaggedCount,
      createdAt,
      lastSequence: moves.length ? moves[moves.length - 1]?.sequence : undefined,
    });
    return snapshot;
  }

  function placeIfNeeded(excludeX: number, excludeY: number) {
    if (minesPlaced) return;
    const exclude = new Set<string>();
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const nx = excludeX + dx,
          ny = excludeY + dy;
        if (
          nx >= 0 &&
          ny >= 0 &&
          nx < params.settings.width &&
          ny < params.settings.height
        ) {
          exclude.add(`${nx},${ny}`);
        }
      }
    }
    placeMines(board, params.settings, exclude, seedState);
    minesPlaced = true;
    status = "playing";
  }

  function checkWin() {
    const total = params.settings.width * params.settings.height;
    if (openedCount === total - params.settings.mines) {
      status = "won";
    }
  }

  function revealAllMines(): Array<{ x: number; y: number }> {
    const changed: Array<{ x: number; y: number }> = [];
    for (let y = 0; y < params.settings.height; y++) {
      for (let x = 0; x < params.settings.width; x++) {
        const c = board[y]?.[x];
        if (c && c.isMine && !c.isOpen) {
          c.isOpen = true;
          changed.push({ x, y });
        }
      }
    }
    return changed;
  }

  function openAt(x: number, y: number): Array<{ x: number; y: number }> {
    if (status === "won" || status === "lost") return [];
    if (x < 0 || y < 0 || x >= params.settings.width || y >= params.settings.height) return [];
    const cell = board[y]?.[x];
    if (!cell || cell.isOpen || cell.isFlagged) return [];

    placeIfNeeded(x, y);

    const changed: Array<{ x: number; y: number }> = [];
    if (cell.isMine) {
      // open this mine and reveal all mines -> lost
      cell.isOpen = true;
      openedCount++;
      changed.push({ x, y });
      changed.push(...revealAllMines());
      status = "lost";
      return changed;
    } else {
      if (cell.adjacent === 0) {
        const newly = floodFillReveal(board, x, y);
        newly.forEach((pt) => {
          const c = board[pt.y]?.[pt.x];
          if (c && c.isOpen) openedCount++;
        });
        changed.push(...newly);
      } else {
        cell.isOpen = true;
        openedCount++;
        changed.push({ x, y });
      }
      checkWin();
      return changed;
    }
  }

  function toggleFlagAt(x: number, y: number): { changed: boolean } {
    if (status === "won" || status === "lost") return { changed: false };
    if (x < 0 || y < 0 || x >= params.settings.width || y >= params.settings.height)
      return { changed: false };
    const cell = board[y]?.[x];
    if (!cell || cell.isOpen) return { changed: false };
    cell.isFlagged = !cell.isFlagged;
    flaggedCount += cell.isFlagged ? 1 : -1;
    return { changed: true };
  }

  function chordAt(x: number, y: number) {
    if (status === "won" || status === "lost") return;
    if (x < 0 || y < 0 || x >= params.settings.width || y >= params.settings.height) return;
    const cell = board[y]?.[x];
    if (!cell || !cell.isOpen) return;
    // count flagged neighbors
    let flagged = 0;
    const neighbors: Array<{ x: number; y: number }> = [];
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
for (const [dx, dy] of NEIGHBORS) {
        const nx = x + dx!,
          ny = y + dy!;
        if (nx >= 0 && ny >= 0 && nx < params.settings.width && ny < params.settings.height) {
          const n = board[ny]?.[nx];
          neighbors.push({ x: nx, y: ny });
          if (n?.isFlagged) flagged++;
        }
      }
    if (flagged !== cell.adjacent) return;
    const changed: Array<{ x: number; y: number }> = [];
    for (const n of neighbors) {
      const nc = board[n.y]?.[n.x];
      if (nc && !nc.isFlagged && !nc.isOpen) {
        if (nc.isMine) {
          // open mine -> lost
          nc.isOpen = true;
          openedCount++;
          changed.push({ x: n.x, y: n.y });
          changed.push(...revealAllMines());
          status = "lost";
          return;
        } else {
          if (nc.adjacent === 0) {
            const newly = floodFillReveal(board, n.x, n.y);
            newly.forEach((pt) => {
              const c = board[pt.y]?.[pt.x];
              if (c && c.isOpen) openedCount++;
            });
            changed.push(...newly);
          } else {
            nc.isOpen = true;
            openedCount++;
            changed.push({ x: n.x, y: n.y });
          }
        }
      }
    }
    checkWin();
  }

  function dispatch(move: Move): GameSnapshot {
    // ensure sequence present (allow engine to assign if missing)
    if (move.sequence === undefined || move.sequence === null) {
      move.sequence = moves.length + 1;
    }
    moves.push(move);

    switch (move.action) {
      case "open": {
        if (move.x === undefined || move.y === undefined) break;
        openAt(move.x, move.y);
        break;
      }
      case "flag": {
        if (move.x === undefined || move.y === undefined) break;
        toggleFlagAt(move.x, move.y);
        break;
      }
      case "chord": {
        if (move.x === undefined || move.y === undefined) break;
        chordAt(move.x, move.y);
        break;
      }
      case "restart": {
        board = createEmptyBoard(params.settings.width, params.settings.height);
        seedState = seedToState(params.seed);
        minesPlaced = false;
        status = "idle";
        moves = [];
        openedCount = 0;
        flaggedCount = 0;
        break;
      }
      default:
        break;
    }
    return computeSnapshot();
  }

  function openCellAt(x: number, y: number, sequence?: number) {
    const seq = sequence ?? moves.length + 1;
    return dispatch({ action: "open", x, y, sequence: seq });
  }

  function toggleFlagAtPublic(x: number, y: number, sequence?: number) {
    const seq = sequence ?? moves.length + 1;
    return dispatch({ action: "flag", x, y, sequence: seq });
  }

  function chordAtPublic(x: number, y: number, sequence?: number) {
    const seq = sequence ?? moves.length + 1;
    return dispatch({ action: "chord", x, y, sequence: seq });
  }

  function restartPublic() {
    dispatch({ action: "restart", sequence: moves.length + 1 });
    return computeSnapshot();
  }

  function getSnapshot() {
    return computeSnapshot();
  }

  function serialize() {
    return serializeEngine({
      engineVersion,
      seed: params.seed,
      settings: params.settings,
      createdAt,
      moves,
    });
  }

  return {
    dispatch,
    openCellAt,
    toggleFlagAt: toggleFlagAtPublic,
    chordAt: chordAtPublic,
    restart: restartPublic,
    getSnapshot,
    serialize,
  };
}

// helper to reconstruct engine from serialization (used by tests / consumers)
export function deserializeToEngine(json: string) {
  const parsed = deserializeEngine(json);
  const engine = createGame({
    seed: parsed.seed,
    settings: parsed.settings,
    createdAt: parsed.createdAt,
  });
  // replay moves deterministically, respecting sequence
  for (const m of parsed.moves ?? []) {
    engine.dispatch(m);
  }
  return engine;
}
