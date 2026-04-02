export function TournamentSkeleton() {
  return (
    <div className="space-y-[var(--space-4)]">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          data-testid="skeleton-card"
          className="animate-pulse border border-[var(--color-border)] p-[var(--space-4)] space-y-[var(--space-3)]"
        >
          <div className="flex items-start justify-between">
            <div className="space-y-[var(--space-2)]">
              <div className="h-5 w-40 bg-[var(--color-surface-elevated)]" />
              <div className="h-3 w-20 bg-[var(--color-surface-elevated)]" />
            </div>
          </div>
          <div className="flex gap-[var(--space-4)]">
            <div className="h-3 w-12 bg-[var(--color-surface-elevated)]" />
            <div className="h-3 w-20 bg-[var(--color-surface-elevated)]" />
            <div className="h-3 w-16 bg-[var(--color-surface-elevated)]" />
          </div>
          <div className="h-7 w-24 bg-[var(--color-surface-elevated)]" />
        </div>
      ))}
    </div>
  );
}
