'use client';

type ErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GameError({ reset }: ErrorProps) {
  return (
    <div className="flex h-full items-center justify-center p-[var(--space-4)]">
      <div className="text-center">
        <p className="text-[var(--text-lg)] font-semibold text-[var(--color-text)]">
          Da xay ra loi khi tai tran dau
        </p>
        <p className="mt-[var(--space-2)] text-[var(--text-sm)] text-[var(--color-text-muted)]">
          Vui long thu lai sau
        </p>
        <div className="mt-[var(--space-4)] flex justify-center gap-[var(--space-3)]">
          <button
            type="button"
            onClick={reset}
            className="border border-[var(--color-border)] px-[var(--space-4)] py-[var(--space-2)] text-[var(--color-text)] hover:bg-[var(--color-surface-elevated)]"
          >
            Thu lai
          </button>
          <a
            href="/dashboard"
            className="border border-[var(--color-border)] px-[var(--space-4)] py-[var(--space-2)] text-[var(--color-text)] hover:bg-[var(--color-surface-elevated)]"
          >
            Quay lai
          </a>
        </div>
      </div>
    </div>
  );
}
