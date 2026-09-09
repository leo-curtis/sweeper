export type Seed = string; // 32 hex chars
export type Difficulty = "beginner" | "intermediate" | "expert" | "custom";
export type EngineVersion = string;

export interface GameSettings {
  difficulty: Difficulty;
  width: number;
  height: number;
  mines: number;
}

export interface Cell {
  readonly x: number;
  readonly y: number;
  readonly isMine: boolean;
  readonly isOpen: boolean;
  readonly isFlagged: boolean;
  readonly adjacent: number;
}

export type Board = ReadonlyArray<ReadonlyArray<Cell>>;

export type GameStatus = "idle" | "playing" | "won" | "lost";

export interface Move {
  action: "open" | "flag" | "chord" | "restart";
  x?: number;
  y?: number;
  sequence: number;
}

export interface GameSnapshot {
  readonly engineVersion: EngineVersion;
  readonly seed: Seed;
  readonly settings: GameSettings;
  readonly board: Board;
  readonly status: GameStatus;
  readonly movesCount: number;
  readonly openedCount: number;
  readonly flaggedCount: number;
  readonly createdAt: number;
  readonly lastSequence?: number;
}

export interface GameEngine {
  dispatch(move: Move): GameSnapshot;
  openCellAt(x: number, y: number, sequence?: number): GameSnapshot;
  toggleFlagAt(x: number, y: number, sequence?: number): GameSnapshot;
  chordAt(x: number, y: number, sequence?: number): GameSnapshot;
  restart(): GameSnapshot;
  getSnapshot(): GameSnapshot;
  serialize(): string;
}
