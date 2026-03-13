import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import {
  getSubjectById,
  setLearnLocale,
  tSubjectTitle,
  tSubjectDescription,
  tSectionTitle,
  tLessonTitle,
  tLessonDescription
} from '@cotulenh/learn';

import { SectionGroup } from '@/components/learn/section-group';

type SubjectPageProps = {
  params: Promise<{ subject: string }>;
};

export async function generateMetadata({ params }: SubjectPageProps): Promise<Metadata> {
  const { subject: subjectId } = await params;
  setLearnLocale('vi');
  const subject = getSubjectById(subjectId);

  if (!subject) {
    return { title: 'Không tìm thấy chủ đề' };
  }

  const title = tSubjectTitle(subject.id, subject.title);
  const description = tSubjectDescription(subject.id, subject.description);

  return {
    title: `${title} - Học Cờ Tư Lệnh`,
    description
  };
}

export default async function SubjectPage({ params }: SubjectPageProps) {
  const { subject: subjectId } = await params;
  setLearnLocale('vi');

  const subject = getSubjectById(subjectId);
  if (!subject) {
    notFound();
  }

  const title = tSubjectTitle(subject.id, subject.title);
  const description = tSubjectDescription(subject.id, subject.description);

  let lessonIndex = 1;

  return (
    <div className="mx-auto max-w-3xl px-[var(--space-4)] py-[var(--space-8)]">
      <Link
        href="/learn"
        className="text-[var(--text-sm)] text-[var(--color-primary)] hover:underline"
      >
        ← Tất cả chủ đề
      </Link>

      <h1 className="mt-[var(--space-4)] text-[var(--text-2xl)] font-bold text-[var(--color-text)]">
        {title}
      </h1>
      <p className="mt-[var(--space-2)] text-[var(--text-base)] text-[var(--color-text-muted)]">
        {description}
      </p>

      <div className="mt-[var(--space-6)] space-y-[var(--space-6)]">
        {subject.sections.map((section) => {
          const sectionStartIndex = lessonIndex;
          lessonIndex += section.lessons.length;

          return (
            <SectionGroup
              key={section.id}
              subjectId={subject.id}
              title={tSectionTitle(subject.id, section.id, section.title)}
              startIndex={sectionStartIndex}
              lessons={section.lessons.map((lesson) => ({
                lessonId: lesson.id,
                title: tLessonTitle(subject.id, lesson.id, lesson.title),
                description: tLessonDescription(subject.id, lesson.id, lesson.description)
              }))}
            />
          );
        })}
      </div>
    </div>
  );
}
