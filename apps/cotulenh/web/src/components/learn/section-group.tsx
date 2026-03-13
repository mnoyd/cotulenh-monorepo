'use client';

import { useLearnProgress } from '@/hooks/use-learn-progress';
import { useLearnStore } from '@/stores/learn-store';

import { LessonListItem } from './lesson-list-item';

type LessonData = {
  lessonId: string;
  title: string;
  description: string;
  completed?: boolean;
};

type SectionGroupProps = {
  subjectId: string;
  title: string;
  lessons: LessonData[];
  startIndex?: number;
};

export function SectionGroup({ subjectId, title, lessons, startIndex = 1 }: SectionGroupProps) {
  const { initialized, progressVersion } = useLearnProgress();
  const isLessonCompleted = useLearnStore((s) => s.isLessonCompleted);

  return (
    <section>
      <h2 className="mb-[var(--space-3)] text-[var(--text-lg)] font-semibold text-[var(--color-text)]">
        {title}
      </h2>
      <div className="space-y-[var(--space-2)]">
        {lessons.map((lesson, i) => {
          const completed =
            initialized && progressVersion >= 0
              ? isLessonCompleted(lesson.lessonId)
              : lesson.completed;

          return (
            <LessonListItem
              key={lesson.lessonId}
              subjectId={subjectId}
              lessonId={lesson.lessonId}
              title={lesson.title}
              description={lesson.description}
              index={startIndex + i}
              completed={completed}
            />
          );
        })}
      </div>
    </section>
  );
}
