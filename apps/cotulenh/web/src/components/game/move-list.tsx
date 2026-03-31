'use client';

import { useRef, useEffect } from 'react';

import { cn } from '@/lib/utils/cn';

type MoveListProps = {
  moveHistory: string[];
  className?: string;
  currentMoveIndex?: number;
  onMoveClick?: (index: number) => void;
};

export function MoveList({ moveHistory, className, currentMoveIndex, onMoveClick }: MoveListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLTableCellElement>(null);
  const hasMoves = moveHistory.length > 0;
  const isInteractive = currentMoveIndex !== undefined;

  // Auto-scroll to keep current move visible
  useEffect(() => {
    if (isInteractive && activeRef.current) {
      activeRef.current.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
    } else if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [isInteractive, currentMoveIndex, moveHistory.length]);

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

  // In interactive mode, highlight by currentMoveIndex; otherwise by last move
  const highlightIndex = isInteractive ? (currentMoveIndex ?? -1) : moveHistory.length;

  return (
    <div ref={scrollRef} className={cn('overflow-y-auto p-[var(--space-3)]', className)}>
      <table className="w-full font-[family-name:var(--font-mono)] text-[var(--text-sm)]">
        <tbody>
          {isInteractive ? (
            <tr key="start-position">
              <td className="w-[3ch] pr-[var(--space-2)] text-right text-[var(--color-text-muted)]">
                0.
              </td>
              <td
                colSpan={2}
                ref={highlightIndex === 0 ? activeRef : undefined}
                className={cn(
                  'px-[var(--space-1)]',
                  highlightIndex === 0 && 'bg-[var(--color-surface-elevated)] font-bold',
                  onMoveClick && 'cursor-pointer hover:bg-[var(--color-surface-elevated)]'
                )}
                onClick={onMoveClick ? () => onMoveClick(0) : undefined}
              >
                Vi tri ban dau
              </td>
            </tr>
          ) : null}
          {rows.map((row) => {
            // Move indices are 1-based in the replay engine: index N means "after move N"
            // Red move at row N is moveHistory[(N-1)*2], which corresponds to replay index (N-1)*2 + 1
            const redMoveIndex = (row.number - 1) * 2 + 1;
            const blueMoveIndex = (row.number - 1) * 2 + 2;

            const redHighlighted = redMoveIndex === highlightIndex;
            const blueHighlighted = blueMoveIndex === highlightIndex;

            return (
              <tr key={row.number}>
                <td className="w-[3ch] pr-[var(--space-2)] text-right text-[var(--color-text-muted)]">
                  {row.number}.
                </td>
                <td
                  ref={redHighlighted ? activeRef : undefined}
                  className={cn(
                    'px-[var(--space-1)]',
                    redHighlighted && 'bg-[var(--color-surface-elevated)] font-bold',
                    onMoveClick && 'cursor-pointer hover:bg-[var(--color-surface-elevated)]'
                  )}
                  onClick={onMoveClick ? () => onMoveClick(redMoveIndex) : undefined}
                >
                  {row.red}
                </td>
                <td
                  ref={blueHighlighted ? activeRef : undefined}
                  className={cn(
                    'px-[var(--space-1)]',
                    blueHighlighted && 'bg-[var(--color-surface-elevated)] font-bold',
                    onMoveClick &&
                      row.blue &&
                      'cursor-pointer hover:bg-[var(--color-surface-elevated)]'
                  )}
                  onClick={onMoveClick && row.blue ? () => onMoveClick(blueMoveIndex) : undefined}
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
