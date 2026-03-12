export default function DashboardLoading() {
  return (
    <div className="grid grid-cols-1 gap-[var(--space-4)] p-[var(--space-4)] lg:grid-cols-[1fr_320px]">
      <div className="animate-pulse space-y-[var(--space-4)]">
        <div className="grid grid-cols-2 gap-[var(--space-4)]">
          <div className="h-[100px] bg-[var(--color-surface-elevated)]" />
          <div className="h-[100px] bg-[var(--color-surface-elevated)]" />
          <div className="h-[100px] bg-[var(--color-surface-elevated)]" />
          <div className="h-[100px] bg-[var(--color-surface-elevated)]" />
        </div>
        <div className="h-48 bg-[var(--color-surface-elevated)]" />
        <div className="h-48 bg-[var(--color-surface-elevated)]" />
      </div>
      <div className="animate-pulse space-y-[var(--space-4)]">
        <div className="h-48 bg-[var(--color-surface-elevated)]" />
        <div className="h-48 bg-[var(--color-surface-elevated)]" />
      </div>
    </div>
  );
}
