export default function LeaderboardLoading() {
  return (
    <div className="p-[var(--space-4)]">
      <div className="animate-pulse border border-[var(--color-border)] p-[var(--space-4)]">
        <div className="mb-[var(--space-4)] space-y-[var(--space-2)]">
          <div className="h-7 w-56 bg-[var(--color-surface-elevated)]" />
          <div className="h-4 w-full max-w-2xl bg-[var(--color-surface-elevated)]" />
        </div>
        <div className="space-y-[var(--space-3)]">
          <div className="h-12 bg-[var(--color-surface-elevated)]" />
          <div className="h-12 bg-[var(--color-surface-elevated)]" />
          <div className="h-12 bg-[var(--color-surface-elevated)]" />
          <div className="h-12 bg-[var(--color-surface-elevated)]" />
        </div>
      </div>
    </div>
  );
}
