import type { Metadata } from 'next';

import { subjects, setLearnLocale, tSubjectTitle, tSubjectDescription } from '@cotulenh/learn';

import { LearnHubClient } from '@/components/learn/learn-hub-client';

export const metadata: Metadata = {
  title: 'Học Cờ Tư Lệnh',
  description:
    'Khám phá luật chơi và các bài học nhập môn Cờ Tư Lệnh. Học cách di chuyển quân, địa hình, bắt quân và nhiều hơn nữa.'
};

function getTotalLessonCount(subject: (typeof subjects)[number]): number {
  return subject.sections.reduce((total, section) => total + section.lessons.length, 0);
}

export default function LearnPage() {
  setLearnLocale('vi');

  const subjectData = subjects.map((subject) => ({
    id: subject.id,
    title: tSubjectTitle(subject.id, subject.title),
    description: tSubjectDescription(subject.id, subject.description),
    lessonCount: getTotalLessonCount(subject)
  }));

  return (
    <div className="mx-auto max-w-5xl px-[var(--space-4)] py-[var(--space-8)]">
      <h1 className="text-[var(--text-2xl)] font-bold text-[var(--color-text)]">Học Cờ Tư Lệnh</h1>
      <p className="mt-[var(--space-2)] text-[var(--text-base)] text-[var(--color-text-muted)]">
        Chọn chủ đề để bắt đầu học
      </p>
      <div className="mt-[var(--space-6)]">
        <LearnHubClient subjectData={subjectData} />
      </div>
    </div>
  );
}
