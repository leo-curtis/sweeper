import { createContext, useContext, ReactNode } from 'react';
import { GameSnapshot, GameSettings, Seed } from '@engine';

interface GameContextType {
  snapshot: GameSnapshot | null;
  dispatch: (action: GameAction) => void;
  newGame: (settings: GameSettings, seed?: Seed) => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export type GameAction =
  | { type: 'OPEN_CELL'; x: number; y: number }
  | { type: 'TOGGLE_FLAG'; x: number; y: number }
  | { type: 'CHORD'; x: number; y: number }
  | { type: 'RESTART' };

export function GameProvider({ children }: { children: ReactNode }) {
  // Provider implementation will be added in next commit
  return <>{children}</>;
}

export function useGame(): GameContextType {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within GameProvider');
  }
  return context;
}
