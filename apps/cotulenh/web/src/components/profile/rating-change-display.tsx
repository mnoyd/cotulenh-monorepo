'use client';

import { useEffect, useState } from 'react';

import type { RatingChange } from '@/stores/game-store';

type RatingChangeDisplayProps = {
  change?: RatingChange | null;
  className?: string;
};

const ANIMATION_MS = 500;
const FRAME_MS = 16;

function getDeltaClass(delta: number): string {
  if (delta > 0) return 'text-[var(--color-success)]';
  if (delta < 0) return 'text-[var(--color-error)]';
  return 'text-[var(--color-text-muted)]';
}

function formatDelta(delta: number): string {
  return delta > 0 ? `+${delta}` : `${delta}`;
}

export function RatingChangeDisplay({ change, className }: RatingChangeDisplayProps) {
  const [displayedNew, setDisplayedNew] = useState(change?.new ?? null);
  const [displayedDelta, setDisplayedDelta] = useState(change?.delta ?? null);

  useEffect(() => {
    if (!change) {
      setDisplayedNew(null);
      setDisplayedDelta(null);
      return;
    }

    const prefersReducedMotion =
      typeof window !== 'undefined'
        ? (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false)
        : false;

    if (prefersReducedMotion) {
      setDisplayedNew(change.new);
      setDisplayedDelta(change.delta);
      return;
    }

    setDisplayedNew(change.old);
    setDisplayedDelta(0);

    const totalFrames = Math.max(1, Math.round(ANIMATION_MS / FRAME_MS));
    let frame = 0;

    const timerId = window.setInterval(() => {
      frame += 1;
      const progress = Math.min(frame / totalFrames, 1);
      const nextValue = Math.round(change.old + (change.new - change.old) * progress);
      setDisplayedNew(nextValue);
      setDisplayedDelta(nextValue - change.old);

      if (progress >= 1) {
        window.clearInterval(timerId);
      }
    }, FRAME_MS);

    return () => {
      window.clearInterval(timerId);
    };
  }, [change]);

  if (!change || displayedNew == null || displayedDelta == null) {
    return null;
  }

  return (
    <div
      aria-live="polite"
      className={[
        'mt-[var(--space-3)] flex items-center justify-center gap-[var(--space-2)] text-[var(--text-base)] font-medium',
        'font-mono tabular-nums',
        className
      ]
        .filter(Boolean)
        .join(' ')}
      data-testid="rating-change-display"
    >
      <span className="text-[var(--color-text-muted)]" data-testid="rating-change-old">
        {change.old}
      </span>
      <span className="text-[var(--color-text-muted)]" aria-hidden="true">
        →
      </span>
      <span className="text-[var(--color-text)]" data-testid="rating-change-new">
        {displayedNew}
      </span>
      <span className={getDeltaClass(change.delta)} data-testid="rating-change-delta">
        ({formatDelta(displayedDelta)})
      </span>
    </div>
  );
}
