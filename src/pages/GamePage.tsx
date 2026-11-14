import { useState, useEffect } from 'react';
import { GameSettings, Opening, Seed, validateSeed } from '@engine';
import { useGameEngine } from '@/hooks/useGameEngine';
import { useTheme } from '@/hooks/useTheme';
import { Header } from '@/components/Header';
import { Board } from '@/components/Board';
import { Button } from '@/components/Button';

const BEGINNER: GameSettings = { difficulty: 'beginner', width: 9, height: 9, mines: 10 };
const INTERMEDIATE: GameSettings = { difficulty: 'intermediate', width: 16, height: 16, mines: 40 };
const EXPERT: GameSettings = { difficulty: 'expert', width: 30, height: 16, mines: 99 };

function generateSeed(): Seed {
  const hex = Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return hex as Seed;
}

const DIFFICULTY_BY_NAME = {
  beginner: BEGINNER,
  intermediate: INTERMEDIATE,
  expert: EXPERT,
} as const;

interface GameConfig {
  seed: Seed;
  settings: GameSettings;
  opening?: Opening;
}

// Shared links carry ?seed=, ?difficulty= and the opening cell (?x=, ?y=).
// Re-applying the opening rebuilds the sharer's exact minefield.
function parseOpening(params: URLSearchParams, settings: GameSettings): Opening | undefined {
  const rawX = params.get('x');
  const rawY = params.get('y');
  if (rawX === null || rawY === null) return undefined;
  const x = Number(rawX);
  const y = Number(rawY);
  if (!Number.isInteger(x) || !Number.isInteger(y)) return undefined;
  if (x < 0 || y < 0 || x >= settings.width || y >= settings.height) return undefined;
  return { x, y };
}

function getInitialGame(): GameConfig {
  try {
    const params = new URLSearchParams(window.location.search);
    const seedParam = params.get('seed');
    const diffParam = params.get('difficulty');
    if (seedParam) {
      validateSeed(seedParam);
      const settings =
        (diffParam && DIFFICULTY_BY_NAME[diffParam as keyof typeof DIFFICULTY_BY_NAME]) ||
        BEGINNER;
      return {
        seed: seedParam as Seed,
        settings,
        opening: parseOpening(params, settings),
      };
    }
  } catch {
    // Non-browser environment or malformed URL — fall through to a fresh game.
  }
  return { seed: generateSeed(), settings: BEGINNER };
}

function shareUrlFor(seed: Seed, settings: GameSettings, opening?: Opening): string {
  const url = new URL(window.location.href);
  url.searchParams.set('seed', seed);
  url.searchParams.set('difficulty', settings.difficulty);
  if (opening) {
    url.searchParams.set('x', String(opening.x));
    url.searchParams.set('y', String(opening.y));
  } else {
    url.searchParams.delete('x');
    url.searchParams.delete('y');
  }
  return url.toString();
}

export function GamePage() {
  const [config, setConfig] = useState<GameConfig>(getInitialGame);
  const [timer, setTimer] = useState(0);
  const [copied, setCopied] = useState(false);

  const { seed, settings: difficulty, opening: requestedOpening } = config;
  const { snapshot, openCell, toggleFlag, chord } = useGameEngine(
    seed,
    difficulty,
    requestedOpening
  );
  const { theme, toggle } = useTheme();

  const opening = snapshot?.opening;
  const openingX = opening?.x;
  const openingY = opening?.y;
  const timerRunning = snapshot?.status === 'playing' && snapshot.movesCount > 0;

  useEffect(() => {
    if (!timerRunning) return;

    const interval = setInterval(() => {
      setTimer((t) => t + 1000);
    }, 1000);

    return () => clearInterval(interval);
  }, [timerRunning]);

  // Reset the timer on a new game.
  useEffect(() => {
    setTimer(0);
  }, [config]);

  // Keep the URL in sync (including the opening cell) so it stays shareable.
  useEffect(() => {
    const openingForUrl =
      openingX === undefined || openingY === undefined
        ? undefined
        : { x: openingX, y: openingY };
    try {
      window.history.replaceState(null, '', shareUrlFor(seed, difficulty, openingForUrl));
    } catch {
      // History API unavailable — the share button still copies a valid link.
    }
  }, [seed, difficulty, openingX, openingY]);

  const handleShare = async () => {
    const url = shareUrlFor(seed, difficulty, opening);
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Sweeper board', url });
        return;
      } catch (e) {
        // User dismissed the sheet — stop. Anything else falls to clipboard.
        if (e instanceof DOMException && e.name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable (permissions, non-secure context) — nothing to show.
    }
  };

  const handleRestart = () => {
    setConfig({ seed: generateSeed(), settings: difficulty });
  };

  const handleDifficultyChange = (newDifficulty: GameSettings) => {
    setConfig({ seed: generateSeed(), settings: newDifficulty });
  };

  if (!snapshot) {
    return <div className="w-full h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="w-full min-h-screen flex flex-col items-center justify-start gap-4 p-4 pt-8 bg-gradient-to-b from-slate-100 to-slate-300 dark:from-zinc-900 dark:to-black">
      {/* Toolbar: difficulty selector */}
      <div className="flex gap-1 items-center flex-wrap justify-center">
        <Button size="sm" variant={difficulty.difficulty === 'beginner' ? 'primary' : 'secondary'} onClick={() => handleDifficultyChange(BEGINNER)}>
          Beginner (9x9)
        </Button>
        <Button size="sm" variant={difficulty.difficulty === 'intermediate' ? 'primary' : 'secondary'} onClick={() => handleDifficultyChange(INTERMEDIATE)}>
          Intermediate (16x16)
        </Button>
        <Button size="sm" variant={difficulty.difficulty === 'expert' ? 'primary' : 'secondary'} onClick={() => handleDifficultyChange(EXPERT)}>
          Expert (30x16)
        </Button>
      </div>

      <Header snapshot={snapshot} timer={timer} onRestart={handleRestart} />

      <div className="w-full max-w-full overflow-x-auto flex justify-center">
        <Board board={snapshot.board} onOpen={openCell} onFlag={toggleFlag} onChord={chord} />
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
        Right-click, two-finger click, or long-press to flag • Double-click a number to open the rest
      </p>

      {snapshot.status === 'won' && (
        <div className="text-center">
          <h2 className="text-3xl font-bold text-violet-600 dark:text-violet-400 mb-2">You Won!</h2>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            {snapshot.movesCount} moves in {Math.floor(timer / 1000)}s
          </p>
          <Button onClick={handleRestart} className="mt-4">
            Play Again
          </Button>
        </div>
      )}

      {snapshot.status === 'lost' && (
        <div className="text-center">
          <h2 className="text-3xl font-bold text-red-600 dark:text-red-400 mb-2">Game Over!</h2>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Hit a mine after {snapshot.movesCount} moves
          </p>
          <Button onClick={handleRestart} className="mt-4">
            Try Again
          </Button>
        </div>
      )}

      <div className="flex gap-2 items-center justify-center">
        <Button variant="ghost" size="sm" onClick={handleShare} aria-label="Copy a link to this board">
          {copied ? '✓ Copied!' : '🔗 Share board'}
        </Button>
        <Button variant="ghost" size="sm" onClick={toggle} aria-label="Toggle color theme">
          {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
        </Button>
      </div>
    </div>
  );
}
