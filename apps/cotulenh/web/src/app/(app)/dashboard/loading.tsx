export default function DashboardLoading() {
  return (
    <div className="p-[var(--space-4)]">
      <div className="animate-pulse space-y-[var(--space-4)]">
        <div className="h-8 w-48 bg-[var(--color-surface-elevated)]" />
        <div className="grid grid-cols-1 gap-[var(--space-4)] md:grid-cols-3">
          <div className="h-32 bg-[var(--color-surface-elevated)]" />
          <div className="h-32 bg-[var(--color-surface-elevated)]" />
          <div className="h-32 bg-[var(--color-surface-elevated)]" />
        </div>
      </div>
    </div>
  );
}
