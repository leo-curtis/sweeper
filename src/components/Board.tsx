import { memo } from 'react';
import { Board as BoardType } from '@engine';
import { Cell } from './Cell';

interface BoardProps {
  board: BoardType;
  onOpen: (x: number, y: number) => void;
  onFlag: (x: number, y: number) => void;
  onChord: (x: number, y: number) => void;
}

export const Board = memo(function Board({ board, onOpen, onFlag, onChord }: BoardProps) {
  const height = board.length;
  const width = board[0]?.length ?? 0;

  return (
    <div
      className="inline-grid gap-1 p-3 bg-slate-400 dark:bg-zinc-700 rounded-2xl ring-1 ring-black/10 dark:ring-white/10 shadow-xl"
      style={{
        gridTemplateColumns: `repeat(${width}, minmax(30px, 1fr))`,
        gridTemplateRows: `repeat(${height}, minmax(30px, 1fr))`,
      }}
      role="grid"
      aria-label="Sweeper game board"
    >
      {board.map((row) =>
        row.map((cell) => (
          <div key={`${cell.x}-${cell.y}`} style={{ minWidth: '30px', minHeight: '30px' }}>
            <Cell cell={cell} onOpen={onOpen} onFlag={onFlag} onChord={onChord} />
          </div>
        ))
      )}
    </div>
  );
});
