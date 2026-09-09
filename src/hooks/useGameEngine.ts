import { useCallback, useEffect, useRef, useState } from 'react';
import { createGame, GameEngine, GameSnapshot } from '@engine';
import type { GameSettings, Seed } from '@engine';

export function useGameEngine(initialSeed: Seed, initialSettings: GameSettings) {
  // The engine is mutable, so it lives in a ref — never inside render-phase
  // state. (A useReducer reducer must be pure: React StrictMode double-invokes
  // reducers in dev, which used to toggle a flag on-and-off again per click.)
  const engineRef = useRef<GameEngine | null>(null);
  const [snapshot, setSnapshot] = useState<GameSnapshot | null>(null);

  // (Re)create the game when seed or settings change.
  useEffect(() => {
    const engine = createGame({ seed: initialSeed, settings: initialSettings });
    engineRef.current = engine;
    setSnapshot(engine.getSnapshot());
    return () => {
      if (engineRef.current === engine) engineRef.current = null;
    };
  }, [initialSeed, initialSettings]);

  const openCell = useCallback((x: number, y: number) => {
    const engine = engineRef.current;
    if (!engine) return;
    setSnapshot(engine.openCellAt(x, y));
  }, []);

  const toggleFlag = useCallback((x: number, y: number) => {
    const engine = engineRef.current;
    if (!engine) return;
    setSnapshot(engine.toggleFlagAt(x, y));
  }, []);

  const chord = useCallback((x: number, y: number) => {
    const engine = engineRef.current;
    if (!engine) return;
    setSnapshot(engine.chordAt(x, y));
  }, []);

  const restart = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    setSnapshot(engine.restart());
  }, []);

  return {
    snapshot,
    openCell,
    toggleFlag,
    chord,
    restart,
  };
}
