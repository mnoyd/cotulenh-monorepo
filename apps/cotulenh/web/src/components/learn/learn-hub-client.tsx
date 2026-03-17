'use client';

import Link from 'next/link';

import { useAuthLearnProgress } from '@/hooks/use-auth-learn-progress';
import { useLearnStore } from '@/stores/learn-store';
import { subjects, setLearnLocale, tSubjectTitle, tLessonTitle } from '@cotulenh/learn';

import { SignupPrompt } from './signup-prompt';
import { SubjectGrid } from './subject-grid';

type SubjectData = {
  id: string;
  title: string;
  description: string;
  lessonCount: number;
  completedLessons?: number;
  earnedStars?: number;
  totalStars?: number;
  progressPending?: boolean;
};

type LearnHubClientProps = {
  subjectData: SubjectData[];
};

export function LearnHubClient({ subjectData }: LearnHubClientProps) {
  const { initialized, progressVersion, authState } = useAuthLearnProgress();
  const getSubjectProgress = useLearnStore((s) => s.getSubjectProgress);
  const getCompletedLessonCount = useLearnStore((s) => s.getCompletedLessonCount);
  const getSubjectStarCount = useLearnStore((s) => s.getSubjectStarCount);
  const getNextIncompleteLesson = useLearnStore((s) => s.getNextIncompleteLesson);
  const hasAnyProgress = useLearnStore((s) => s.hasAnyProgress);
  const getTotalCompletedCount = useLearnStore((s) => s.getTotalCompletedCount);

  const progressPending = !initialized && progressVersion === 0;

  const enrichedSubjects = subjectData.map((subject) => {
    if (progressPending) {
      return {
        ...subject,
        progressPending: true
      };
    }

    const completedLessons = getCompletedLessonCount(subject.id);
    const starCount = getSubjectStarCount(subject.id);

    return {
      ...subject,
      completedLessons: completedLessons > 0 ? completedLessons : undefined,
      earnedStars: completedLessons > 0 ? starCount.earned : undefined,
      totalStars: completedLessons > 0 ? starCount.total : undefined,
      progressPending: false
    };
  });

  // Find first in-progress subject for continue banner
  let continueBanner: {
    subjectId: string;
    subjectTitle: string;
    lessonTitle: string;
    progress: number;
    lessonId: string;
  } | null = null;

  if ((initialized || progressVersion > 0) && hasAnyProgress()) {
    setLearnLocale('vi');
    for (const subject of subjects) {
      const progress = getSubjectProgress(subject.id);
      if (progress.progress > 0 && !progress.completed) {
        const nextLesson = getNextIncompleteLesson(subject.id);
        if (nextLesson) {
          continueBanner = {
            subjectId: subject.id,
            subjectTitle: tSubjectTitle(subject.id, subject.title),
            lessonTitle: tLessonTitle(subject.id, nextLesson.lessonId, nextLesson.title),
            progress: progress.progress,
            lessonId: nextLesson.lessonId
          };
          break;
        }
      }
    }
  }

  return (
    <>
      {progressPending ? (
        <div
          className="mb-[var(--space-6)] border border-[var(--color-border)] p-[var(--space-4)]"
          aria-label="Đang tải tiến độ học"
        >
          <div className="h-4 w-24 animate-pulse bg-[var(--color-border)]" aria-hidden="true" />
          <div
            className="mt-[var(--space-2)] h-5 w-48 animate-pulse bg-[var(--color-border)]"
            aria-hidden="true"
          />
          <div
            className="mt-[var(--space-2)] h-1 w-full animate-pulse bg-[var(--color-border)]"
            aria-hidden="true"
          />
        </div>
      ) : continueBanner ? (
        <div className="mb-[var(--space-6)] border border-[var(--color-primary)] p-[var(--space-4)]">
          <p className="text-[var(--text-sm)] font-medium text-[var(--color-primary)]">
            Tiếp tục học
          </p>
          <p className="mt-[var(--space-1)] text-[var(--text-base)] font-semibold text-[var(--color-text)]">
            {continueBanner.subjectTitle} — {continueBanner.lessonTitle}
          </p>
          <div className="mt-[var(--space-2)] h-1 w-full bg-[var(--color-border)]">
            <div
              className="h-full bg-[var(--color-primary)]"
              style={{ width: `${continueBanner.progress}%` }}
            />
          </div>
          <Link
            href={`/learn/${continueBanner.subjectId}#lesson-${continueBanner.lessonId}`}
            className="mt-[var(--space-3)] inline-block text-[var(--text-sm)] font-medium text-[var(--color-primary)] hover:underline"
          >
            Tiếp tục
          </Link>
        </div>
      ) : null}
      {authState !== 'loading' && (
        <SignupPrompt
          isAuthenticated={authState === 'authenticated'}
          completedLessonCount={getTotalCompletedCount()}
          className="mb-[var(--space-6)]"
        />
      )}
      <SubjectGrid subjects={enrichedSubjects} />
    </>
  );
}
