export default function GameLoading() {
  const boardTrackClass = 'w-full min-w-[min(60vw,60svh)] max-w-[min(92vw,92svh)]';

  return (
    <div className="flex h-full flex-col lg:flex-row">
      {/* Board section */}
      <div className="flex flex-1 flex-col items-center justify-center p-[var(--space-4)]">
        {/* Opponent player bar placeholder */}
        <div className={`mb-[var(--space-2)] animate-pulse ${boardTrackClass}`}>
          <div className="flex items-center gap-[var(--space-3)] p-[var(--space-2)]">
            <div className="h-8 w-8 bg-[var(--color-surface-elevated)]" />
            <div className="h-4 w-24 bg-[var(--color-surface-elevated)]" />
            <div className="ml-auto h-6 w-16 bg-[var(--color-surface-elevated)]" />
          </div>
        </div>

        {/* Board placeholder */}
        <div
          className={`aspect-square animate-pulse bg-[var(--color-surface-elevated)] ${boardTrackClass}`}
        />

        {/* Self player bar placeholder */}
        <div className={`mt-[var(--space-2)] animate-pulse ${boardTrackClass}`}>
          <div className="flex items-center gap-[var(--space-3)] p-[var(--space-2)]">
            <div className="h-8 w-8 bg-[var(--color-surface-elevated)]" />
            <div className="h-4 w-24 bg-[var(--color-surface-elevated)]" />
            <div className="ml-auto h-6 w-16 bg-[var(--color-surface-elevated)]" />
          </div>
        </div>
      </div>

      {/* Right panel placeholder (desktop only) */}
      <div className="hidden w-[280px] animate-pulse border-l border-[var(--color-border)] p-[var(--space-4)] lg:block">
        <div className="h-6 w-20 bg-[var(--color-surface-elevated)]" />
        <div className="mt-[var(--space-4)] h-48 bg-[var(--color-surface-elevated)]" />
        <div className="mt-[var(--space-4)] flex gap-[var(--space-2)]">
          <div className="h-10 flex-1 bg-[var(--color-surface-elevated)]" />
          <div className="h-10 flex-1 bg-[var(--color-surface-elevated)]" />
          <div className="h-10 flex-1 bg-[var(--color-surface-elevated)]" />
        </div>
      </div>
    </div>
  );
}
