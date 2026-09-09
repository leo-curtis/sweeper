import { memo } from 'react';
import { GameSnapshot, GameStatus } from '@engine';

interface HeaderProps {
  snapshot: GameSnapshot;
  timer: number;
  onRestart: () => void;
}

export const Header = memo(function Header({ snapshot, timer, onRestart }: HeaderProps) {
  const getFaceEmoji = (status: GameStatus) => {
    switch (status) {
      case 'playing':
      case 'idle':
        return '🙂';
      case 'won':
        return '😎';
      case 'lost':
        return '😵';
    }
  };

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    return `${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  };

  const minesRemaining = snapshot.settings.mines - snapshot.flaggedCount;
  const minesLabel =
    minesRemaining < 0
      ? '-' + String(Math.abs(minesRemaining)).padStart(2, '0')
      : String(minesRemaining).padStart(3, '0');

  return (
    <div className="flex items-center justify-between w-full max-w-sm px-3 py-2 bg-white dark:bg-zinc-900 rounded-2xl ring-1 ring-black/5 dark:ring-white/10 shadow-md">
      <div className="px-2 py-1 rounded-md bg-slate-100 dark:bg-zinc-900 font-mono text-lg text-red-600 dark:text-red-500 ring-1 ring-black/10 dark:ring-0 tabular-nums">{minesLabel}</div>

      <button
        onClick={onRestart}
        className="w-12 h-12 flex items-center justify-center text-3xl rounded-full bg-slate-100 dark:bg-zinc-800 ring-1 ring-black/10 dark:ring-white/10 shadow hover:scale-105 transition-transform active:scale-95"
        aria-label="Restart game"
      >
        {getFaceEmoji(snapshot.status)}
      </button>

      <div className="px-2 py-1 rounded-md bg-slate-100 dark:bg-zinc-900 font-mono text-lg text-red-600 dark:text-red-500 ring-1 ring-black/10 dark:ring-0 tabular-nums">{formatTime(timer)}</div>
    </div>
  );
});
