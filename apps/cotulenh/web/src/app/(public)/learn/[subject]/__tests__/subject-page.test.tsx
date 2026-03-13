import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const mockNotFound = vi.fn();
vi.mock('next/navigation', () => ({
  notFound: () => {
    mockNotFound();
    throw new Error('NEXT_NOT_FOUND');
  }
}));

vi.mock('@cotulenh/learn', () => ({
  getSubjectById: (id: string) => {
    if (id === 'subject-1-basic-movement') {
      return {
        id: 'subject-1-basic-movement',
        title: 'Basic Movement',
        description: 'Learn basic piece movement',
        sections: [
          {
            id: 'section-1',
            title: 'Section One',
            lessons: [
              { id: 'bm-1', title: 'Lesson 1', description: 'First lesson' },
              { id: 'bm-2', title: 'Lesson 2', description: 'Second lesson' }
            ]
          },
          {
            id: 'section-2',
            title: 'Section Two',
            lessons: [{ id: 'bm-3', title: 'Lesson 3', description: 'Third lesson' }]
          }
        ]
      };
    }
    return undefined;
  },
  setLearnLocale: vi.fn(),
  tSubjectTitle: (_sid: string, fallback: string) => fallback,
  tSubjectDescription: (_sid: string, fallback: string) => fallback,
  tSectionTitle: (_sid: string, _secId: string, fallback: string) => fallback,
  tLessonTitle: (_sid: string, _lid: string, fallback: string) => fallback,
  tLessonDescription: (_sid: string, _lid: string, fallback: string) => fallback
}));

vi.mock('@/components/learn/section-group', () => ({
  SectionGroup: ({
    title,
    startIndex,
    lessons
  }: {
    title: string;
    startIndex: number;
    lessons: { lessonId: string; title: string; description: string }[];
  }) => (
    <div data-testid="section-group" data-title={title} data-start={startIndex}>
      {lessons.map((l) => (
        <div key={l.lessonId} data-testid={`lesson-${l.lessonId}`}>
          {l.title}
        </div>
      ))}
    </div>
  )
}));

import SubjectPage from '../page';

describe('SubjectPage', () => {
  it('renders sections with lessons grouped correctly', async () => {
    const page = await SubjectPage({
      params: Promise.resolve({ subject: 'subject-1-basic-movement' })
    });
    render(page);

    const sections = screen.getAllByTestId('section-group');
    expect(sections).toHaveLength(2);
    expect(sections[0]).toHaveAttribute('data-title', 'Section One');
    expect(sections[1]).toHaveAttribute('data-title', 'Section Two');
  });

  it('passes correct startIndex for lesson numbering across sections', async () => {
    const page = await SubjectPage({
      params: Promise.resolve({ subject: 'subject-1-basic-movement' })
    });
    render(page);

    const sections = screen.getAllByTestId('section-group');
    expect(sections[0]).toHaveAttribute('data-start', '1');
    expect(sections[1]).toHaveAttribute('data-start', '3');
  });

  it('renders all lessons within their sections', async () => {
    const page = await SubjectPage({
      params: Promise.resolve({ subject: 'subject-1-basic-movement' })
    });
    render(page);

    expect(screen.getByTestId('lesson-bm-1')).toBeInTheDocument();
    expect(screen.getByTestId('lesson-bm-2')).toBeInTheDocument();
    expect(screen.getByTestId('lesson-bm-3')).toBeInTheDocument();
  });

  it('renders back link to learn hub', async () => {
    const page = await SubjectPage({
      params: Promise.resolve({ subject: 'subject-1-basic-movement' })
    });
    render(page);

    const backLink = screen.getByRole('link', { name: /Tất cả chủ đề/ });
    expect(backLink).toHaveAttribute('href', '/learn');
  });

  it('renders subject title and description', async () => {
    const page = await SubjectPage({
      params: Promise.resolve({ subject: 'subject-1-basic-movement' })
    });
    render(page);

    expect(screen.getByText('Basic Movement')).toBeInTheDocument();
    expect(screen.getByText('Learn basic piece movement')).toBeInTheDocument();
  });

  it('calls notFound for invalid subject', async () => {
    await expect(
      SubjectPage({
        params: Promise.resolve({ subject: 'nonexistent' })
      })
    ).rejects.toThrow('NEXT_NOT_FOUND');
    expect(mockNotFound).toHaveBeenCalled();
  });
});
