import { SubjectGridSkeleton } from '@/components/learn/subject-grid-skeleton';

export default function LearnLoading() {
  return (
    <div className="mx-auto max-w-5xl px-[var(--space-4)] py-[var(--space-8)]">
      <div className="animate-pulse">
        <div className="h-8 w-48 bg-[var(--color-surface-elevated)]" />
        <div className="mt-[var(--space-2)] h-5 w-64 bg-[var(--color-surface-elevated)]" />
      </div>
      <div className="mt-[var(--space-6)]">
        <SubjectGridSkeleton />
      </div>
    </div>
  );
}
