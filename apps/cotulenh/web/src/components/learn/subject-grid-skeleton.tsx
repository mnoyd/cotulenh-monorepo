export function SubjectGridSkeleton() {
  return (
    <div className="animate-pulse grid grid-cols-1 gap-[var(--space-4)] sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 9 }).map((_, i) => (
        <div
          key={i}
          data-testid="skeleton-card"
          className="border border-[var(--color-border)] p-[var(--space-4)] space-y-[var(--space-3)]"
        >
          <div className="h-6 w-3/4 bg-[var(--color-surface-elevated)]" />
          <div className="h-4 w-full bg-[var(--color-surface-elevated)]" />
          <div className="h-4 w-1/3 bg-[var(--color-surface-elevated)]" />
        </div>
      ))}
    </div>
  );
}
