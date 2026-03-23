import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const mockNotFound = vi.fn();
vi.mock('next/navigation', () => ({
  notFound: () => {
    mockNotFound();
    throw new Error('NEXT_NOT_FOUND');
  }
}));

vi.mock('@/components/learn/lesson-view-client', () => ({
  LessonViewClient: ({ lessonId, subjectId }: { lessonId: string; subjectId: string }) => (
    <div data-testid="lesson-view" data-lesson-id={lessonId} data-subject-id={subjectId} />
  )
}));

vi.mock('@cotulenh/learn', () => ({
  getSubjectById: (id: string) => {
    if (id === 'subject-1-basic-movement') {
      return {
        id: 'subject-1-basic-movement',
        title: 'Di chuyển cơ bản',
        description: 'Học cách di chuyển quân',
        sections: []
      };
    }
    return undefined;
  },
  getLessonById: (id: string) => {
    if (id === 'bm-1') {
      return {
        id: 'bm-1',
        title: 'Quân Bộ Binh',
        description: 'Học cách di chuyển quân bộ binh',
        startFen: 'some-fen'
      };
    }
    return undefined;
  },
  getLessonContext: (id: string) => {
    if (id === 'bm-1') {
      return {
        lesson: { id: 'bm-1' },
        subject: { id: 'subject-1-basic-movement' },
        section: { id: 'section-1' },
        positionInSection: 1,
        totalInSection: 3,
        positionInSubject: 1,
        totalInSubject: 10,
        prevLesson: null,
        nextLesson: { id: 'bm-2' }
      };
    }
    return undefined;
  },
  setLearnLocale: vi.fn(),
  tSubjectTitle: (_sid: string, fallback: string) => fallback,
  tLessonTitle: (_sid: string, _lid: string, fallback: string) => fallback,
  tLessonDescription: (_sid: string, _lid: string, fallback: string) => fallback
}));

import LessonPage from '../page';

describe('LessonPage', () => {
  it('renders lesson with back link to subject', async () => {
    const page = await LessonPage({
      params: Promise.resolve({ subject: 'subject-1-basic-movement', id: 'bm-1' })
    });
    render(page);

    const backLink = screen.getByRole('link', { name: /Di chuyển cơ bản/ });
    expect(backLink).toHaveAttribute('href', '/learn/subject-1-basic-movement');
  });

  it('renders lesson title', async () => {
    const page = await LessonPage({
      params: Promise.resolve({ subject: 'subject-1-basic-movement', id: 'bm-1' })
    });
    render(page);

    expect(screen.getByText('Quân Bộ Binh')).toBeInTheDocument();
  });

  it('renders LessonView with correct props', async () => {
    const page = await LessonPage({
      params: Promise.resolve({ subject: 'subject-1-basic-movement', id: 'bm-1' })
    });
    render(page);

    const lessonView = screen.getByTestId('lesson-view');
    expect(lessonView).toHaveAttribute('data-lesson-id', 'bm-1');
    expect(lessonView).toHaveAttribute('data-subject-id', 'subject-1-basic-movement');
  });

  it('calls notFound for invalid subject', async () => {
    await expect(
      LessonPage({
        params: Promise.resolve({ subject: 'nonexistent', id: 'bm-1' })
      })
    ).rejects.toThrow('NEXT_NOT_FOUND');
    expect(mockNotFound).toHaveBeenCalled();
  });

  it('calls notFound for invalid lesson', async () => {
    await expect(
      LessonPage({
        params: Promise.resolve({ subject: 'subject-1-basic-movement', id: 'nonexistent' })
      })
    ).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('calls notFound when lesson does not belong to subject', async () => {
    await expect(
      LessonPage({
        params: Promise.resolve({ subject: 'other-subject', id: 'bm-1' })
      })
    ).rejects.toThrow('NEXT_NOT_FOUND');
  });
});
