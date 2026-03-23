'use client';

import dynamic from 'next/dynamic';

type LessonViewClientProps = {
  lessonId: string;
  subjectId: string;
};

const LessonView = dynamic(() => import('./lesson-view').then((m) => ({ default: m.LessonView })), {
  ssr: false
});

export function LessonViewClient(props: LessonViewClientProps) {
  return <LessonView {...props} />;
}
