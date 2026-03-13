import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { LearnHubClient } from '../learn-hub-client';

const authLearnProgressState = {
  initialized: true,
  progressVersion: 1,
  authState: 'unauthenticated' as 'loading' | 'authenticated' | 'unauthenticated',
  saveLessonProgress: vi.fn()
};

const storeState = {
  getSubjectProgress: () => ({
    subjectId: 'subject-1-basic-movement',
    completed: false,
    sections: {},
    progress: 50
  }),
  getCompletedLessonCount: () => 3,
  getSubjectStarCount: () => ({ earned: 7, total: 15 }),
  getNextIncompleteLesson: () => ({
    lessonId: 'bm-1-2',
    sectionId: 'section-1-basic-units',
    title: 'Infantry Movement'
  }),
  hasAnyProgress: () => true,
  getTotalCompletedCount: () => 3
};

vi.mock('@/hooks/use-auth-learn-progress', () => ({
  useAuthLearnProgress: () => authLearnProgressState
}));

vi.mock('@/stores/learn-store', () => ({
  useLearnStore: <T,>(selector: (state: typeof storeState) => T) => selector(storeState)
}));

vi.mock('@cotulenh/learn', () => ({
  subjects: [
    {
      id: 'subject-1-basic-movement',
      title: 'Di chuyển cơ bản',
      sections: []
    }
  ],
  setLearnLocale: vi.fn(),
  tSubjectTitle: (_subjectId: string, fallback: string) => fallback,
  tLessonTitle: (_subjectId: string, _lessonId: string, fallback: string) => fallback
}));

describe('LearnHubClient', () => {
  it('renders loading placeholders before progress hydration completes', () => {
    authLearnProgressState.initialized = false;
    authLearnProgressState.progressVersion = 0;

    render(
      <LearnHubClient
        subjectData={[
          {
            id: 'subject-1-basic-movement',
            title: 'Di chuyển cơ bản',
            description: 'Mô tả',
            lessonCount: 5
          }
        ]}
      />
    );

    expect(screen.getByLabelText('Đang tải tiến độ học')).toBeInTheDocument();
    expect(screen.queryByText('3/5 bài học')).not.toBeInTheDocument();
  });

  it('links the continue banner to the current lesson anchor', () => {
    authLearnProgressState.initialized = true;
    authLearnProgressState.progressVersion = 1;

    render(
      <LearnHubClient
        subjectData={[
          {
            id: 'subject-1-basic-movement',
            title: 'Di chuyển cơ bản',
            description: 'Mô tả',
            lessonCount: 5
          }
        ]}
      />
    );

    const link = screen.getByRole('link', { name: 'Tiếp tục' });
    expect(link).toHaveAttribute('href', '/learn/subject-1-basic-movement#lesson-bm-1-2');
  });

  it('shows aggregated subject progress from stored completions', () => {
    authLearnProgressState.initialized = true;
    authLearnProgressState.progressVersion = 1;

    render(
      <LearnHubClient
        subjectData={[
          {
            id: 'subject-1-basic-movement',
            title: 'Di chuyển cơ bản',
            description: 'Mô tả',
            lessonCount: 5
          }
        ]}
      />
    );

    expect(screen.getByText('3/5 bài học')).toBeInTheDocument();
  });
});
