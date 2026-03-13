import { cn } from '@/lib/utils/cn';

type LessonListItemProps = {
  subjectId: string;
  lessonId: string;
  title: string;
  description: string;
  index: number;
  completed?: boolean;
  stars?: 0 | 1 | 2 | 3;
  progressPending?: boolean;
};

export function LessonListItem({
  lessonId,
  title,
  description,
  index,
  completed,
  stars,
  progressPending
}: LessonListItemProps) {
  return (
    <div
      id={`lesson-${lessonId}`}
      className={cn(
        'flex items-start gap-[var(--space-3)] border border-[var(--color-border)] p-[var(--space-3)]',
        completed && 'bg-[var(--color-surface-elevated)]'
      )}
    >
      <div className="flex h-7 w-7 shrink-0 items-center justify-center border border-[var(--color-border)] text-[var(--text-sm)] font-medium text-[var(--color-text-muted)]">
        {progressPending ? (
          <span className="h-3 w-3 animate-pulse bg-[var(--color-border)]" aria-hidden="true" />
        ) : completed ? (
          <span className="text-[var(--color-primary)]">✓</span>
        ) : (
          <span>{index}</span>
        )}
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-[var(--space-2)]">
          <h3 className="text-[var(--text-base)] font-medium text-[var(--color-text)]">{title}</h3>
          {progressPending ? (
            <span
              className="inline-block h-3 w-10 animate-pulse bg-[var(--color-border)]"
              aria-hidden="true"
            />
          ) : completed && stars !== undefined ? (
            <div className="flex gap-px" aria-label={`${stars} sao`}>
              {[1, 2, 3].map((i) => (
                <span
                  key={i}
                  className={cn(
                    'text-[var(--text-xs)]',
                    i <= stars ? 'text-[var(--color-warning)]' : 'text-[var(--color-text-muted)]'
                  )}
                >
                  ★
                </span>
              ))}
            </div>
          ) : null}
        </div>
        <p className="mt-[var(--space-1)] text-[var(--text-sm)] text-[var(--color-text-muted)]">
          {description}
        </p>
      </div>
    </div>
  );
}
