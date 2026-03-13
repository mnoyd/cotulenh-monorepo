import Link from 'next/link';

import type { LessonResult } from '@cotulenh/learn';

import { cn } from '@/lib/utils/cn';

type LessonCompletionProps = {
  result: LessonResult;
  successMessage: string;
  nextLessonHref: string | null;
  subjectHref: string;
  onRestart: () => void;
};

function StarDisplay({ stars }: { stars: number }) {
  return (
    <div className="flex gap-[var(--space-1)]" aria-label={`${stars} sao`}>
      {[1, 2, 3].map((i) => (
        <span
          key={i}
          className={cn(
            'text-[var(--text-2xl)]',
            i <= stars ? 'text-[var(--color-warning)]' : 'text-[var(--color-text-muted)]'
          )}
        >
          ★
        </span>
      ))}
    </div>
  );
}

export function LessonCompletion({
  result,
  successMessage,
  nextLessonHref,
  subjectHref,
  onRestart
}: LessonCompletionProps) {
  return (
    <div
      className="flex flex-col items-center gap-[var(--space-4)] p-[var(--space-6)] text-center"
      role="status"
      aria-live="assertive"
    >
      <div className="text-[var(--text-2xl)]">🎉</div>
      {result.stars > 0 && <StarDisplay stars={result.stars} />}
      <p className="text-[var(--text-lg)] font-bold text-[var(--color-text)]">{successMessage}</p>

      <div className="flex flex-col gap-[var(--space-2)]">
        {nextLessonHref && (
          <Link
            href={nextLessonHref}
            className="border border-[var(--color-primary)] bg-[var(--color-primary)] px-[var(--space-6)] py-[var(--space-2)] text-[var(--text-base)] font-medium text-[var(--color-on-primary)]"
          >
            Bài tiếp theo
          </Link>
        )}
        <button
          type="button"
          onClick={onRestart}
          className="border border-[var(--color-border)] px-[var(--space-6)] py-[var(--space-2)] text-[var(--text-base)] text-[var(--color-text)] hover:bg-[var(--color-surface-elevated)]"
        >
          Làm lại
        </button>
        <Link
          href={subjectHref}
          className="text-[var(--text-sm)] text-[var(--color-primary)] hover:underline"
        >
          Quay lại danh sách bài học
        </Link>
      </div>
    </div>
  );
}
