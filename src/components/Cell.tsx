import { memo, useRef } from 'react';
import { Cell as CellType } from '@engine';

interface CellProps {
  cell: CellType;
  onOpen: (x: number, y: number) => void;
  onFlag: (x: number, y: number) => void;
  onChord: (x: number, y: number) => void;
}

// Hold duration before a press counts as a long-press flag (touch / pen).
const LONG_PRESS_MS = 450;

export const Cell = memo(function Cell({ cell, onOpen, onFlag, onChord }: CellProps) {
  const timer = useRef<number | null>(null);
  const suppressClick = useRef(false);
  const lastLongPress = useRef(0);

  const clearTimer = () => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    // Only start a long-press for touch/pen or the primary mouse button,
    // so right-click flagging never double-fires.
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    suppressClick.current = false;
    clearTimer();
    timer.current = window.setTimeout(() => {
      timer.current = null;
      suppressClick.current = true;
      lastLongPress.current = Date.now();
      onFlag(cell.x, cell.y);
      navigator.vibrate?.(10);
    }, LONG_PRESS_MS);
  };

  const handlePointerUp = () => {
    clearTimer();
  };

  const handleClick = () => {
    // Click fired right after a long-press flag must not also open the cell.
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    onOpen(cell.x, cell.y);
  };

  const handleRightClick = (e: React.MouseEvent) => {
    e.preventDefault();
    // A long-press on touch can be followed by a synthetic contextmenu —
    // don't let it toggle the flag straight back off.
    if (Date.now() - lastLongPress.current < 800) return;
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
    'w-full h-full flex items-center justify-center select-none rounded-md',
    'font-mono font-bold text-lg',
    'border border-black/10 dark:border-black/40',
    'transition-all duration-100',
    cell.isOpen ? 'bg-slate-300 dark:bg-zinc-800' : 'bg-slate-100 hover:bg-slate-200 dark:bg-zinc-500 dark:hover:bg-zinc-400',
    cell.isOpen && cell.isMine ? 'bg-red-500 dark:bg-red-600' : '',
    !cell.isOpen ? 'cursor-pointer active:scale-95' : '',
    cell.adjacent > 0 && cell.isOpen ? getNumberColor(cell.adjacent) : '',
  ].filter(Boolean).join(' ');

  return (
    <button
      onClick={handleClick}
      onContextMenu={handleRightClick}
      onDoubleClick={handleDoubleClick}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className={cellClass}
      aria-label={`Cell ${cell.x},${cell.y}${
        cell.isFlagged ? ' flagged' : cell.isOpen ? cell.isMine ? ' mine' : ` ${cell.adjacent} adjacent` : ' closed'
      }`}
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
