export default function TournamentDetailLoading() {
  return (
    <div className="p-[var(--space-6)] max-w-2xl mx-auto animate-pulse">
      <div className="mb-[var(--space-6)]">
        <div className="h-7 w-48 bg-[var(--color-border)] rounded" />
        <div className="mt-[var(--space-3)] flex gap-[var(--space-4)]">
          <div className="h-5 w-16 bg-[var(--color-border)] rounded" />
          <div className="h-5 w-24 bg-[var(--color-border)] rounded" />
          <div className="h-5 w-16 bg-[var(--color-border)] rounded" />
        </div>
      </div>

      <div className="h-6 w-32 bg-[var(--color-border)] rounded mb-[var(--space-3)]" />
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="flex justify-between py-[var(--space-2)] border-b border-[var(--color-border)]"
        >
          <div className="h-4 w-8 bg-[var(--color-border)] rounded" />
          <div className="h-4 w-24 bg-[var(--color-border)] rounded" />
          <div className="h-4 w-8 bg-[var(--color-border)] rounded" />
          <div className="h-4 w-8 bg-[var(--color-border)] rounded" />
        </div>
      ))}
    </div>
  );
}
