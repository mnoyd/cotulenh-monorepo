'use client';

import { cn } from '@/lib/utils/cn';

type DeployControlsProps = {
  canCommit: boolean;
  deploySubmitted: boolean;
  opponentDeploySubmitted: boolean;
  onCommit: () => void;
  onUndo: () => void;
  className?: string;
};

export function DeployControls({
  canCommit,
  deploySubmitted,
  opponentDeploySubmitted,
  onCommit,
  onUndo,
  className
}: DeployControlsProps) {
  if (deploySubmitted) {
    return (
      <div
        className={cn(
          'flex flex-col items-center gap-[var(--space-2)] p-[var(--space-3)]',
          className
        )}
      >
        <p className="text-[var(--text-sm)] text-[var(--color-text-muted)]" aria-live="polite">
          Dang cho doi thu...
        </p>
        {opponentDeploySubmitted ? (
          <p className="text-[var(--text-sm)] text-[var(--color-text)]">Doi thu da xac nhan</p>
        ) : null}
      </div>
    );
  }

  return (
    <div className={cn('flex items-center gap-[var(--space-2)] p-[var(--space-2)]', className)}>
      <button
        type="button"
        onClick={onUndo}
        className="min-h-[44px] flex-1 border border-[var(--color-border)] text-[var(--text-sm)] text-[var(--color-text)] hover:bg-[var(--color-surface-elevated)]"
        aria-label="Hoan tac bo tri"
      >
        Hoan tac
      </button>
      <button
        type="button"
        onClick={onCommit}
        disabled={!canCommit}
        className="min-h-[44px] flex-1 border border-[var(--color-border)] text-[var(--text-sm)] text-[var(--color-text)] hover:bg-[var(--color-surface-elevated)] disabled:opacity-50"
        aria-label="Xac nhan bo tri"
      >
        Xac nhan
      </button>
    </div>
  );
}
