'use client';

import { useRef, useEffect } from 'react';

import { cn } from '@/lib/utils/cn';

type MoveListProps = {
  moveHistory: string[];
  className?: string;
};

export function MoveList({ moveHistory, className }: MoveListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasMoves = moveHistory.length > 0;

  // Auto-scroll to latest move
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [moveHistory.length]);

  if (!hasMoves) {
    return (
      <div className={cn('p-[var(--space-3)]', className)}>
        <p className="text-[var(--text-sm)] text-[var(--color-text-muted)]">Chua co nuoc di nao</p>
      </div>
    );
  }

  // Build two-column rows: move number | red move | blue move
  const rows: Array<{ number: number; red: string; blue?: string }> = [];
  for (let i = 0; i < moveHistory.length; i += 2) {
    rows.push({
      number: Math.floor(i / 2) + 1,
      red: moveHistory[i],
      blue: moveHistory[i + 1]
    });
  }

  const lastMoveIndex = moveHistory.length - 1;

  return (
    <div ref={scrollRef} className={cn('overflow-y-auto p-[var(--space-3)]', className)}>
      <table className="w-full font-[family-name:var(--font-mono)] text-[var(--text-sm)]">
        <tbody>
          {rows.map((row) => {
            const redIndex = (row.number - 1) * 2;
            const blueIndex = redIndex + 1;

            return (
              <tr key={row.number}>
                <td className="w-[3ch] pr-[var(--space-2)] text-right text-[var(--color-text-muted)]">
                  {row.number}.
                </td>
                <td
                  className={cn(
                    'px-[var(--space-1)]',
                    redIndex === lastMoveIndex && 'bg-[var(--color-surface-elevated)] font-bold'
                  )}
                >
                  {row.red}
                </td>
                <td
                  className={cn(
                    'px-[var(--space-1)]',
                    blueIndex === lastMoveIndex && 'bg-[var(--color-surface-elevated)] font-bold'
                  )}
                >
                  {row.blue ?? ''}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
