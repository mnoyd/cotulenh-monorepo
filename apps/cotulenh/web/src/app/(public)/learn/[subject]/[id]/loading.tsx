export default function LessonLoading() {
  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 border-b border-[var(--color-border)] px-[var(--space-4)] py-[var(--space-2)]">
        <div className="animate-pulse">
          <div className="h-4 w-24 bg-[var(--color-surface-elevated)]" />
          <div className="mt-[var(--space-1)] h-6 w-48 bg-[var(--color-surface-elevated)]" />
        </div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* Board placeholder */}
        <div className="flex items-center justify-center lg:w-[60%]">
          <div className="aspect-square w-full max-w-[600px] animate-pulse bg-[var(--color-surface-elevated)]" />
        </div>
        {/* Panel placeholder */}
        <div className="flex-1 animate-pulse border-t border-[var(--color-border)] p-[var(--space-4)] lg:border-l lg:border-t-0">
          <div className="h-5 w-32 bg-[var(--color-surface-elevated)]" />
          <div className="mt-[var(--space-3)] h-4 w-full bg-[var(--color-surface-elevated)]" />
          <div className="mt-[var(--space-2)] h-4 w-3/4 bg-[var(--color-surface-elevated)]" />
          <div className="mt-[var(--space-6)] h-10 w-full bg-[var(--color-surface-elevated)]" />
        </div>
      </div>
    </div>
  );
}
