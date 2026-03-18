'use client';

import { cn } from '@/lib/utils/cn';
import { ChessClock } from './chess-clock';

type PlayerInfoBarProps = {
  name: string;
  rating: number;
  color: 'red' | 'blue';
  isActive: boolean;
  clockMs: number | null;
  clockRunning: boolean;
  className?: string;
};

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function PlayerInfoBar({
  name,
  rating,
  color,
  isActive,
  clockMs,
  clockRunning,
  className
}: PlayerInfoBarProps) {
  const borderColor = color === 'red' ? 'border-l-[hsl(0,70%,50%)]' : 'border-l-[hsl(210,70%,50%)]';

  const clockBg = color === 'red' ? 'bg-[hsl(0,70%,50%,0.1)]' : 'bg-[hsl(210,70%,50%,0.1)]';

  const statusText = isActive ? `${name}, ${rating} diem, dang di` : `${name}, ${rating} diem`;

  return (
    <div
      className={cn(
        'flex items-center gap-[var(--space-3)] border border-[var(--color-border)] p-[var(--space-2)]',
        isActive && `border-l-4 ${borderColor}`,
        className
      )}
      aria-label={statusText}
    >
      {/* Avatar with initials fallback */}
      <div className="hidden h-8 w-8 shrink-0 items-center justify-center border border-[var(--color-border)] bg-[var(--color-surface-elevated)] text-[var(--text-xs)] font-medium text-[var(--color-text-muted)] sm:flex">
        {getInitials(name)}
      </div>

      {/* Name + rating */}
      <div className="min-w-0 flex-1">
        <span className="truncate text-[var(--text-sm)] font-semibold text-[var(--color-text)]">
          {name}
        </span>
        <span className="ml-[var(--space-2)] hidden text-[var(--text-xs)] text-[var(--color-text-muted)] sm:inline">
          ({rating})
        </span>
      </div>

      {/* Clock */}
      {clockMs !== null ? (
        <div
          className={cn(
            'shrink-0 px-[var(--space-2)] py-[var(--space-1)] text-[var(--text-sm)]',
            clockBg
          )}
        >
          <ChessClock timeMs={clockMs} isRunning={clockRunning} isPlayerClock={isActive} />
        </div>
      ) : null}
    </div>
  );
}
