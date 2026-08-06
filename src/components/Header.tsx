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
        return '🙂';
      case 'won':
        return '😎';
      case 'lost':
        return '😵';
      default:
        return '🙂';
    }
  };

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    return `${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  };

  const minesRemaining = snapshot.settings.mines - snapshot.flaggedCount;

  return (
    <div className="flex items-center justify-between w-full max-w-md px-4 py-3 bg-light-surface dark:bg-dark-surface rounded-lg shadow">
      <div className="text-3xl">⛏️</div>
      <div className="text-2xl">{String(minesRemaining).padStart(3, '0')}</div>

      <button
        onClick={onRestart}
        className="text-4xl hover:scale-110 transition-transform active:scale-95"
        aria-label="Restart game"
      >
        {getFaceEmoji(snapshot.status)}
      </button>

      <div className="font-mono text-2xl">{formatTime(timer)}</div>
      <div className="text-3xl">⏱️</div>
    </div>
  );
});
