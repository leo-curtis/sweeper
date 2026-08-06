import { memo } from 'react';
import { Cell as CellType } from '@engine';

interface CellProps {
  cell: CellType;
  onOpen: (x: number, y: number) => void;
  onFlag: (x: number, y: number) => void;
  onChord: (x: number, y: number) => void;
}

export const Cell = memo(function Cell({ cell, onOpen, onFlag, onChord }: CellProps) {
  const handleClick = () => {
    onOpen(cell.x, cell.y);
  };

  const handleRightClick = (e: React.MouseEvent) => {
    e.preventDefault();
    onFlag(cell.x, cell.y);
  };

  const handleDoubleClick = () => {
    onChord(cell.x, cell.y);
  };

  const cellContent = () => {
    if (cell.isFlagged) return '🚩';
    if (!cell.isOpen) return '';
    if (cell.isMine) return '💣';
    if (cell.adjacent === 0) return '';
    return cell.adjacent.toString();
  };

  const cellClass = [
    'w-full h-full flex items-center justify-center',
    'font-mono font-bold text-lg',
    'border border-light-border dark:border-dark-border',
    'transition-all duration-100',
    cell.isOpen ? 'bg-light-surface dark:bg-dark-surface' : 'bg-gray-400 dark:bg-gray-600 hover:bg-gray-500',
    cell.isOpen && cell.isMine ? 'bg-red-500' : '',
    !cell.isOpen ? 'cursor-pointer active:scale-95' : '',
    cell.adjacent > 0 && cell.isOpen ? getNumberColor(cell.adjacent) : '',
  ].filter(Boolean).join(' ');

  return (
    <button
      onClick={handleClick}
      onContextMenu={handleRightClick}
      onDoubleClick={handleDoubleClick}
      className={cellClass}
      aria-label={`Cell ${cell.x},${cell.y}${
        cell.isFlagged ? ' flagged' : cell.isOpen ? cell.isMine ? ' mine' : ` ${cell.adjacent} adjacent` : ' closed'
      }`}
      disabled={cell.isOpen && !cell.isMine && cell.adjacent === 0}
    >
      {cellContent()}
    </button>
  );
});

function getNumberColor(num: number): string {
  const colors = [
    '',
    'text-blue-600 dark:text-blue-300',
    'text-green-600 dark:text-green-300',
    'text-red-600 dark:text-red-300',
    'text-indigo-600 dark:text-indigo-300',
    'text-red-700 dark:text-red-400',
    'text-teal-600 dark:text-teal-300',
    'text-black dark:text-white',
    'text-gray-600 dark:text-gray-400',
  ];
  return colors[Math.min(num, 8)] || '';
}
