export default function SubjectLoading() {
  return (
    <div className="mx-auto max-w-3xl px-[var(--space-4)] py-[var(--space-8)]">
      <div className="animate-pulse">
        <div className="h-4 w-24 bg-[var(--color-surface-elevated)]" />
        <div className="mt-[var(--space-4)] h-8 w-64 bg-[var(--color-surface-elevated)]" />
        <div className="mt-[var(--space-2)] h-5 w-96 bg-[var(--color-surface-elevated)]" />

        <div className="mt-[var(--space-6)] space-y-[var(--space-6)]">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-[var(--space-2)]">
              <div className="h-6 w-48 bg-[var(--color-surface-elevated)]" />
              {Array.from({ length: 4 }).map((_, j) => (
                <div
                  key={j}
                  className="h-16 w-full border border-[var(--color-border)] bg-[var(--color-surface-elevated)]"
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
