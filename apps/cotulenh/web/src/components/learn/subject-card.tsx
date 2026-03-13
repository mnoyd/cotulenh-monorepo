import Link from 'next/link';

import { cn } from '@/lib/utils/cn';

type SubjectCardProps = {
  id: string;
  title: string;
  description: string;
  lessonCount: number;
  completedLessons?: number;
};

export function SubjectCard({
  id,
  title,
  description,
  lessonCount,
  completedLessons
}: SubjectCardProps) {
  const hasProgress = completedLessons !== undefined && completedLessons > 0;

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
      <div className="mt-[var(--space-3)] text-[var(--text-sm)] text-[var(--color-text-muted)]">
        {hasProgress ? (
          <span>
            {completedLessons}/{lessonCount} bài học
          </span>
        ) : (
          <span>{lessonCount} bài học</span>
        )}
      </div>
      {hasProgress && (
        <div className="mt-[var(--space-2)] h-1 w-full bg-[var(--color-border)]">
          <div
            className="h-full bg-[var(--color-primary)]"
            style={{ width: `${(completedLessons / lessonCount) * 100}%` }}
          />
        </div>
      )}
    </Link>
  );
}
