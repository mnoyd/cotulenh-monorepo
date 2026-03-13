import { cn } from '@/lib/utils/cn';

type LessonListItemProps = {
  subjectId: string;
  lessonId: string;
  title: string;
  description: string;
  index: number;
  completed?: boolean;
};

export function LessonListItem({
  lessonId,
  title,
  description,
  index,
  completed
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
        {completed ? <span className="text-[var(--color-primary)]">✓</span> : <span>{index}</span>}
      </div>
      <div className="min-w-0">
        <h3 className="text-[var(--text-base)] font-medium text-[var(--color-text)]">{title}</h3>
        <p className="mt-[var(--space-1)] text-[var(--text-sm)] text-[var(--color-text-muted)]">
          {description}
        </p>
      </div>
    </div>
  );
}
