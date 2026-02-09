'use client';

import React, { useEffect, useMemo, useReducer, useState } from 'react';
import {
  createGameReducer,
  createInitialState,
  pointKey,
  isPlayableChar,
  type Direction,
  type GameConfig
} from '@/lib/snake';

const CONFIG: GameConfig = {
  rows: 20,
  cols: 20,
  startLength: 3,
  pointsPerLetter: 10
};

const TICK_MS = 120;
const DEFAULT_PHRASE = 'MAE-IN LOVES YOU';

const DIRECTIONS: Record<string, Direction> = {
  arrowup: 'up',
  arrowdown: 'down',
  arrowleft: 'left',
  arrowright: 'right',
  w: 'up',
  s: 'down',
  a: 'left',
  d: 'right'
};

export default function SnakePage() {
  const [phraseInput, setPhraseInput] = useState(DEFAULT_PHRASE);
  const [state, dispatch] = useReducer(
    createGameReducer(CONFIG),
    CONFIG,
    (config) => createInitialState(config, DEFAULT_PHRASE)
  );

  useEffect(() => {
    if (state.status !== 'running') {
      return;
    }

    const timer = window.setInterval(() => {
      dispatch({ type: 'tick' });
    }, TICK_MS);

    return () => window.clearInterval(timer);
  }, [state.status, dispatch]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const direction = DIRECTIONS[key];

      if (direction) {
        event.preventDefault();
        dispatch({ type: 'setDirection', direction });
        return;
      }

      if (key === ' ') {
        event.preventDefault();
        dispatch({ type: 'togglePause' });
        return;
      }

      if (key === 'r') {
        dispatch({ type: 'restart', phrase: phraseInput });
      }
    };

    window.addEventListener('keydown', handleKeyDown, { passive: false });
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dispatch, phraseInput]);

  const cells = useMemo(() => {
    const snakeSet = new Set(state.snake.map(pointKey));
    const headKey = state.snake.length > 0 ? pointKey(state.snake[0]) : '';
    const foodKey = state.food ? pointKey(state.food.position) : '';
    const items: React.ReactNode[] = [];

    for (let y = 0; y < CONFIG.rows; y += 1) {
      for (let x = 0; x < CONFIG.cols; x += 1) {
        const key = `${x}-${y}`;
        const cellKey = pointKey({ x, y });
        const isHead = cellKey === headKey;
        const isFood = cellKey === foodKey;
        const isSnake = snakeSet.has(cellKey);

        let className = 'bg-[#f3efe8]';
        if (isFood) className = 'bg-[#8d1f2d] text-[#f8f4ee]';
        else if (isHead) className = 'bg-[#1f1b1b]';
        else if (isSnake) className = 'bg-[#3a3434]';

        items.push(
          <div
            key={key}
            className={`w-full h-full flex items-center justify-center text-[10px] font-semibold ${className}`}
          >
            {isFood ? state.food?.char : ''}
          </div>
        );
      }
    }

    return items;
  }, [state.snake, state.food]);

  const boardStyle = {
    '--cell': 'clamp(12px, 3vw, 18px)',
    gridTemplateColumns: `repeat(${CONFIG.cols}, var(--cell))`,
    gridTemplateRows: `repeat(${CONFIG.rows}, var(--cell))`
  } as React.CSSProperties;

  const controlButtonClass =
    'w-12 h-12 rounded-xl bg-[#f3efe8] border border-[#e0d7cb] text-[#1f1b1b] hover:bg-[#e9e2d6] active:bg-[#dfd6c7] transition';

  const phraseProgress = useMemo(() => {
    const currentIndex = state.status === 'completed' ? state.phrase.length : state.letterIndex;
    return Array.from(state.phrase).map((char, index) => {
      const isDone = index < currentIndex;
      const isCurrent = index === currentIndex;
      const displayChar = char === ' ' ? '\u00A0' : char;
      const baseClass = 'inline-block px-0.5';
      if (isCurrent) {
        return (
          <span key={`${char}-${index}`} className={`${baseClass} text-[#8d1f2d] font-semibold`}>
            {displayChar}
          </span>
        );
      }
      if (isDone) {
        return (
          <span key={`${char}-${index}`} className={`${baseClass} text-[#7a7269]`}>
            {displayChar}
          </span>
        );
      }
      return (
        <span key={`${char}-${index}`} className={`${baseClass} text-[#1f1b1b]`}>
          {displayChar}
        </span>
      );
    });
  }, [state.phrase, state.letterIndex, state.status]);

  const totalLetters = useMemo(
    () => Array.from(state.phrase).filter(isPlayableChar).length,
    [state.phrase]
  );
  const collectedLetters = useMemo(() => {
    if (state.status === 'completed') {
      return totalLetters;
    }
    return Array.from(state.phrase.slice(0, state.letterIndex)).filter(isPlayableChar).length;
  }, [state.phrase, state.letterIndex, state.status, totalLetters]);

  const flowers = [
    { name: 'Rose', cost: 20 },
    { name: 'Bouquet', cost: 60 },
    { name: 'Grand Arrangement', cost: 120 }
  ];

  return (
    <div className="min-h-screen bg-[#f6f1ea] text-[#1f1b1b] font-outfit flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-3xl rounded-[32px] border border-[#e7ddd2] bg-white/70 p-6 md:p-8 shadow-[0_20px_60px_rgba(32,24,19,0.15)]">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.4em] text-[#7d7368]">MAE-IN EVENTS</p>
            <h1 className="text-3xl md:text-4xl font-semibold font-serif tracking-wide">Valentine Snake</h1>
            <p className="text-sm text-[#7d7368]">Eat the letters in order to spell the love note.</p>
            <div className="flex items-center gap-2 text-lg" aria-hidden="true">
              <span>🌹</span>
              <span>🌹</span>
              <span>🌹</span>
            </div>
          </div>
          <div className="text-right space-y-1">
            <div className="text-xs uppercase tracking-[0.3em] text-[#7d7368]">Points</div>
            <div className="text-3xl font-semibold text-[#8d1f2d]">{state.score}</div>
            <div className="text-xs text-[#7d7368]">
              {state.status === 'gameover'
                ? 'Game Over'
                : state.status === 'paused'
                  ? 'Paused'
                  : state.status === 'completed'
                    ? 'Complete'
                    : 'Running'}
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          <div className="space-y-4">
            <div className="rounded-2xl border border-[#e7ddd2] bg-[#fdfaf6] p-4">
              <div className="text-xs uppercase tracking-[0.3em] text-[#7d7368]">Phrase</div>
              <div className="mt-2 text-lg font-medium whitespace-pre-wrap">{phraseProgress}</div>
              <div className="mt-2 text-xs text-[#7d7368]">
                Letters collected: {collectedLetters}/{totalLetters}
              </div>
            </div>

            <div
              className="grid gap-px bg-[#e7ddd2] p-2 rounded-2xl border border-[#d8cbbf]"
              style={boardStyle}
            >
              {cells}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => dispatch({ type: 'togglePause' })}
                className="px-4 py-2 rounded-lg bg-[#f3efe8] border border-[#e0d7cb] text-sm text-[#1f1b1b] hover:bg-[#e9e2d6] transition"
                disabled={state.status === 'gameover' || state.status === 'completed'}
              >
                {state.status === 'paused' ? 'Resume' : 'Pause'}
              </button>
              <button
                onClick={() => dispatch({ type: 'restart', phrase: phraseInput })}
                className="px-4 py-2 rounded-lg bg-[#8d1f2d] border border-[#8d1f2d] text-sm text-white hover:bg-[#7b1a27] transition"
              >
                Restart
              </button>
            </div>

            {state.status === 'gameover' && (
              <div className="text-sm text-[#8d1f2d]">Press R or Restart to play again.</div>
            )}
            {state.status === 'completed' && (
              <div className="text-sm text-[#8d1f2d]">Perfect! Start a new note whenever you want.</div>
            )}

            <div className="text-xs text-[#7d7368]">
              Use Arrow Keys or WASD. Space pauses. R restarts.
            </div>

            <div className="flex flex-col items-center gap-2 md:hidden">
              <button
                className={controlButtonClass}
                onClick={() => dispatch({ type: 'setDirection', direction: 'up' })}
                aria-label="Move up"
              >
                ▲
              </button>
              <div className="flex items-center gap-2">
                <button
                  className={controlButtonClass}
                  onClick={() => dispatch({ type: 'setDirection', direction: 'left' })}
                  aria-label="Move left"
                >
                  ◀
                </button>
                <button
                  className={controlButtonClass}
                  onClick={() => dispatch({ type: 'setDirection', direction: 'down' })}
                  aria-label="Move down"
                >
                  ▼
                </button>
                <button
                  className={controlButtonClass}
                  onClick={() => dispatch({ type: 'setDirection', direction: 'right' })}
                  aria-label="Move right"
                >
                  ▶
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-[#e7ddd2] bg-white/80 p-4">
              <div className="text-xs uppercase tracking-[0.3em] text-[#7d7368]">Write Your Note</div>
              <input
                value={phraseInput}
                onChange={(event) => setPhraseInput(event.target.value)}
                className="mt-3 w-full rounded-xl border border-[#e0d7cb] bg-white px-3 py-2 text-sm text-[#1f1b1b] focus:outline-none focus:ring-2 focus:ring-[#8d1f2d]/30"
                placeholder="Type a valentine message"
                maxLength={40}
              />
              <div className="mt-3 text-xs text-[#7d7368]">
                Restart to apply the new message. Letters are collected in order.
              </div>
            </div>

            <div className="rounded-2xl border border-[#e7ddd2] bg-white/80 p-4">
              <div className="text-xs uppercase tracking-[0.3em] text-[#7d7368]">Flower Shop</div>
              <div className="mt-3 space-y-2 text-sm text-[#1f1b1b]">
                {flowers.map((flower) => (
                  <div key={flower.name} className="flex items-center justify-between">
                    <div>
                      <span className="font-medium">{flower.name}</span>
                      <span className="text-[#7d7368]"> · {flower.cost} pts</span>
                    </div>
                    <div className="text-[#8d1f2d] font-semibold">
                      x{Math.floor(state.score / flower.cost)}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 text-xs text-[#7d7368]">
                Earn points by collecting letters to build your bouquet.
              </div>
            </div>

            <div className="rounded-2xl border border-[#e7ddd2] bg-[#8d1f2d] p-4 text-white">
              <div className="text-xs uppercase tracking-[0.3em] text-white/70">Red Roses</div>
              <div className="mt-3 flex items-center justify-between">
                <div className="flex items-center gap-2 text-2xl" aria-hidden="true">
                  <span>🌹</span>
                  <span>🌹</span>
                  <span>🌹</span>
                  <span>🌹</span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold">MAE-IN Bouquet</div>
                  <div className="text-xs text-white/70">Limited Valentine special</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
