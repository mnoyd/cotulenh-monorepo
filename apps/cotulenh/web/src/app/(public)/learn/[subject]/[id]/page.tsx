import type { Metadata } from 'next';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import {
  getSubjectById,
  getLessonById,
  getLessonContext,
  setLearnLocale,
  tSubjectTitle,
  tLessonTitle,
  tLessonDescription
} from '@cotulenh/learn';

const LessonView = dynamic(
  () => import('@/components/learn/lesson-view').then((m) => ({ default: m.LessonView })),
  { ssr: false }
);

type LessonPageProps = {
  params: Promise<{ subject: string; id: string }>;
};

export async function generateMetadata({ params }: LessonPageProps): Promise<Metadata> {
  const { subject: subjectId, id: lessonId } = await params;
  setLearnLocale('vi');

  const subject = getSubjectById(subjectId);
  const lesson = getLessonById(lessonId);
  const context = getLessonContext(lessonId);

  if (!subject || !lesson || !context || context.subject.id !== subjectId) {
    return { title: 'Không tìm thấy bài học' };
  }

  const title = tLessonTitle(subjectId, lesson.id, lesson.title);
  const description = tLessonDescription(subjectId, lesson.id, lesson.description);

  return {
    title: `${title} - Học Cờ Tư Lệnh`,
    description
  };
}

export default async function LessonPage({ params }: LessonPageProps) {
  const { subject: subjectId, id: lessonId } = await params;
  setLearnLocale('vi');

  const subject = getSubjectById(subjectId);
  const lesson = getLessonById(lessonId);

  if (!subject || !lesson) {
    notFound();
  }

  // Verify lesson belongs to this subject
  const context = getLessonContext(lessonId);
  if (!context || context.subject.id !== subjectId) {
    notFound();
  }

  const subjectTitle = tSubjectTitle(subjectId, subject.title);
  const lessonTitle = tLessonTitle(subjectId, lesson.id, lesson.title);

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 border-b border-[var(--color-border)] px-[var(--space-4)] py-[var(--space-2)]">
        <Link
          href={`/learn/${subjectId}`}
          className="text-[var(--text-sm)] text-[var(--color-primary)] hover:underline"
        >
          ← {subjectTitle}
        </Link>
        <h1 className="text-[var(--text-lg)] font-bold text-[var(--color-text)]">{lessonTitle}</h1>
      </div>
      <div className="min-h-0 flex-1">
        <LessonView lessonId={lessonId} subjectId={subjectId} />
      </div>
    </div>
  );
}
