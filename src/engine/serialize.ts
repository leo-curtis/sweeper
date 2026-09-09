import { GameSettings, Move } from "./types";

export interface SerializedEngine {
  engineVersion: string;
  seed: string;
  settings: GameSettings;
  createdAt: number;
  moves: Move[];
}

export function serializeEngine(obj: SerializedEngine): string {
  return JSON.stringify(obj);
}

export function deserializeEngine(json: string): SerializedEngine {
  const parsed = JSON.parse(json);
  if (!parsed.engineVersion || !parsed.seed || !parsed.settings) {
    throw new Error("Invalid serialization");
  }
  return parsed as SerializedEngine;
}
