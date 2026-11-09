import {
  Seed,
  GameSettings,
  GameSnapshot,
  GameStatus,
  Move,
  GameEngine,
  Cell,
  Opening,
} from "./types";
import {
  createEmptyBoard,
  placeMines,
  ensureSafeZone,
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
  opening?: Opening;
}): GameEngine {
  validateSeed(params.seed);
  const engineVersion = "1.0";
  const createdAt = params.createdAt ?? Date.now();

  function isInBounds(x: number, y: number) {
    return (
      Number.isInteger(x) &&
      Number.isInteger(y) &&
      x >= 0 &&
      y >= 0 &&
      x < params.settings.width &&
      y < params.settings.height
    );
  }

  // A shared board can name the cell its player opened first. Pre-applying it
  // rebuilds that exact board (including any mines moved for first-click safety).
  const requestedOpening: Opening | undefined =
    params.opening && isInBounds(params.opening.x, params.opening.y)
      ? { x: params.opening.x, y: params.opening.y }
      : undefined;

  let seedState = seedToState(params.seed);

  // Place the minefield up front so the seed alone defines the board. The
  // first click's safe zone is carved out lazily by ensureSafeZone().
  let board: MutableCell[][] = createEmptyBoard(params.settings.width, params.settings.height);
  placeMines(board, params.settings, new Set(), seedState);
  let status: GameStatus = "idle";
  let moves: Move[] = [];
  let openedCount = 0;
  let flaggedCount = 0;
  let safetyApplied = false;
  let opening: Opening | undefined;

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
      opening: opening ? { ...opening } : undefined,
    });
    return snapshot;
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

    if (!safetyApplied) {
      // First open: carve the 3x3 opening area out of the seed-placed minefield.
      ensureSafeZone(board, params.settings, seedState, x, y);
      safetyApplied = true;
      opening = { x, y };
    }
    if (status === "idle") status = "playing";

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
        placeMines(board, params.settings, new Set(), seedState);
        status = "idle";
        moves = [];
        openedCount = 0;
        flaggedCount = 0;
        safetyApplied = false;
        opening = undefined;
        if (requestedOpening) openAt(requestedOpening.x, requestedOpening.y);
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
      opening,
    });
  }

  // A shared board starts from the same opening cell its sharer used, so the
  // minefield (including safety relocations) is reproduced exactly.
  if (requestedOpening) openAt(requestedOpening.x, requestedOpening.y);

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
    opening: parsed.opening,
  });
  // replay moves deterministically, respecting sequence
  for (const m of parsed.moves ?? []) {
    engine.dispatch(m);
  }
  return engine;
}
