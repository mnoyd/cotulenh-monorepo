import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { SectionGroup } from '../section-group';
import { useLearnStore } from '@/stores/learn-store';

function installLocalStorageMock() {
  let storage: Record<string, string> = {};

  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => storage[key] ?? null,
      setItem: (key: string, value: string) => {
        storage[key] = value;
      },
      removeItem: (key: string) => {
        delete storage[key];
      },
      clear: () => {
        storage = {};
      }
    }
  });
}

const lessons = [
  { lessonId: 'bm-1-1', title: 'Bài 1', description: 'Mô tả 1' },
  { lessonId: 'bm-1-2', title: 'Bài 2', description: 'Mô tả 2' }
];

describe('SectionGroup', () => {
  beforeEach(() => {
    installLocalStorageMock();
    window.localStorage.removeItem('learn-progress');
    useLearnStore.getState().reset();
  });

  it('renders section title', () => {
    render(<SectionGroup subjectId="basic-movement" title="Quân cờ cơ bản" lessons={lessons} />);
    expect(screen.getByText('Quân cờ cơ bản')).toBeInTheDocument();
  });

  it('renders all lessons in order', () => {
    render(<SectionGroup subjectId="basic-movement" title="Quân cờ cơ bản" lessons={lessons} />);
    expect(screen.getByText('Bài 1')).toBeInTheDocument();
    expect(screen.getByText('Bài 2')).toBeInTheDocument();
  });

  it('renders lesson indices starting from startIndex', () => {
    render(
      <SectionGroup subjectId="basic-movement" title="Section" lessons={lessons} startIndex={5} />
    );
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('6')).toBeInTheDocument();
  });

  it('shows completed lessons from persisted progress', () => {
    useLearnStore.getState().initialize();
    useLearnStore.getState().saveLessonProgress('bm-1-1', 1, 1);

    render(<SectionGroup subjectId="subject-1-basic-movement" title="Section" lessons={lessons} />);

    expect(screen.getByText('✓')).toBeInTheDocument();
  });

  it('passes star data from store to lesson list items', () => {
    useLearnStore.getState().initialize();
    useLearnStore.getState().saveLessonProgress('bm-1-1', 3, 5);

    render(<SectionGroup subjectId="subject-1-basic-movement" title="Section" lessons={lessons} />);

    expect(screen.getByLabelText('3 sao')).toBeInTheDocument();
  });

  it('does not show stars for incomplete lessons', () => {
    useLearnStore.getState().initialize();

    render(<SectionGroup subjectId="subject-1-basic-movement" title="Section" lessons={lessons} />);

    expect(screen.queryByLabelText(/sao/)).not.toBeInTheDocument();
  });

  it('shows stars on first render when localStorage has progress (eager init)', () => {
    // Pre-populate localStorage with progress before initialization
    window.localStorage.setItem(
      'learn-progress',
      JSON.stringify({
        'bm-1-1': { lessonId: 'bm-1-1', completed: true, moveCount: 3, stars: 2 }
      })
    );

    // Eager init: store reads localStorage synchronously at module scope,
    // so progress is available before the first React render — no flicker.
    useLearnStore.getState().initialize();

    render(<SectionGroup subjectId="subject-1-basic-movement" title="Section" lessons={lessons} />);

    // Stars and checkmark visible on the very first paint
    expect(screen.getByLabelText('2 sao')).toBeInTheDocument();
    expect(screen.getByText('✓')).toBeInTheDocument();
  });
});
