'use client';

import { useEffect } from 'react';

import { useLearnStore } from '@/stores/learn-store';
import { getSubjectById, type SubjectProgress, type SubjectId } from '@cotulenh/learn';

export function useLearnProgress() {
  const initialize = useLearnStore((s) => s.initialize);
  const initialized = useLearnStore((s) => s.initialized);
  const progressVersion = useLearnStore((s) => s.progressVersion);

  useEffect(() => {
    initialize();
  }, [initialize]);

  return { initialized, progressVersion };
}

export function useSubjectProgress(
  subjectId: SubjectId
): SubjectProgress & { completedLessons: number; totalLessons: number } {
  const { initialized } = useLearnProgress();
  const getSubjectProgress = useLearnStore((s) => s.getSubjectProgress);
  const getCompletedLessonCount = useLearnStore((s) => s.getCompletedLessonCount);

  const progress = getSubjectProgress(subjectId);
  const subject = getSubjectById(subjectId);
  const totalLessons =
    subject?.sections.reduce((lessonCount, section) => lessonCount + section.lessons.length, 0) ??
    0;

  if (!initialized) {
    return {
      subjectId,
      completed: false,
      sections: {},
      progress: 0,
      completedLessons: 0,
      totalLessons
    };
  }

  return {
    ...progress,
    completedLessons: getCompletedLessonCount(subjectId),
    totalLessons
  };
}

export function useHasAnyProgress(): boolean {
  const { initialized } = useLearnProgress();
  const hasAnyProgress = useLearnStore((s) => s.hasAnyProgress);

  if (!initialized) return false;
  return hasAnyProgress();
}
