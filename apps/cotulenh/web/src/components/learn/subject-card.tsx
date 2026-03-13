import Link from 'next/link';

import { cn } from '@/lib/utils/cn';

type SubjectCardProps = {
  id: string;
  title: string;
  description: string;
  lessonCount: number;
  completedLessons?: number;
  earnedStars?: number;
  totalStars?: number;
  progressPending?: boolean;
};

export function SubjectCard({
  id,
  title,
  description,
  lessonCount,
  completedLessons,
  earnedStars,
  totalStars,
  progressPending
}: SubjectCardProps) {
  const hasProgress = completedLessons !== undefined && completedLessons > 0;
  const hasStars =
    hasProgress && earnedStars !== undefined && totalStars !== undefined && totalStars > 0;

  return (
    <Link
      href={`/learn/${id}`}
      className={cn(
        'block border border-[var(--color-border)] p-[var(--space-4)]',
        'transition-colors hover:bg-[var(--color-surface-elevated)]'
      )}
    >
      <h2 className="text-[var(--text-lg)] font-semibold text-[var(--color-text)]">{title}</h2>
      <p className="mt-[var(--space-1)] text-[var(--text-sm)] text-[var(--color-text-muted)]">
        {description}
      </p>
      <div className="mt-[var(--space-3)] flex items-center gap-[var(--space-3)] text-[var(--text-sm)] text-[var(--color-text-muted)]">
        {progressPending ? (
          <>
            <span
              className="inline-block h-4 w-20 animate-pulse bg-[var(--color-border)]"
              aria-hidden="true"
            />
            <span
              className="inline-block h-4 w-12 animate-pulse bg-[var(--color-border)]"
              aria-hidden="true"
            />
          </>
        ) : hasProgress ? (
          <span>
            {completedLessons}/{lessonCount} bài học
          </span>
        ) : (
          <span>{lessonCount} bài học</span>
        )}
        {hasStars && (
          <span className="text-[var(--color-warning)]">
            ★ {earnedStars}/{totalStars}
          </span>
        )}
      </div>
      {progressPending ? (
        <div
          className="mt-[var(--space-2)] h-1 w-24 animate-pulse bg-[var(--color-border)]"
          aria-hidden="true"
        />
      ) : hasProgress ? (
        <div className="mt-[var(--space-2)] h-1 w-full bg-[var(--color-border)]">
          <div
            className="h-full bg-[var(--color-primary)]"
            style={{ width: `${(completedLessons / lessonCount) * 100}%` }}
          />
        </div>
      ) : null}
    </Link>
  );
}
