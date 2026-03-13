import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { useLearnStore } from '@/stores/learn-store';
import { SectionGroup } from '../section-group';
import { SubjectCard } from '../subject-card';
import { LessonListItem } from '../lesson-list-item';

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
  { lessonId: 'bm-1-2', title: 'Bài 2', description: 'Mô tả 2' },
  { lessonId: 'bm-1-3', title: 'Bài 3', description: 'Mô tả 3' }
];

describe('Progress Tracking Integration', () => {
  beforeEach(() => {
    installLocalStorageMock();
    window.localStorage.removeItem('learn-progress');
    useLearnStore.getState().reset();
  });

  describe('Lesson completion → store update → UI display', () => {
    it('completing a lesson updates store and shows checkmark and stars', () => {
      useLearnStore.getState().initialize();
      useLearnStore.getState().saveLessonProgress('bm-1-1', 2, 5);

      render(
        <SectionGroup subjectId="subject-1-basic-movement" title="Section" lessons={lessons} />
      );

      expect(screen.getByText('✓')).toBeInTheDocument();
      expect(screen.getByLabelText('2 sao')).toBeInTheDocument();
    });

    it('completing multiple lessons shows all checkmarks and stars', () => {
      useLearnStore.getState().initialize();
      useLearnStore.getState().saveLessonProgress('bm-1-1', 3, 3);
      useLearnStore.getState().saveLessonProgress('bm-1-2', 1, 10);

      render(
        <SectionGroup subjectId="subject-1-basic-movement" title="Section" lessons={lessons} />
      );

      const checkmarks = screen.getAllByText('✓');
      expect(checkmarks).toHaveLength(2);
      expect(screen.getByLabelText('3 sao')).toBeInTheDocument();
      expect(screen.getByLabelText('1 sao')).toBeInTheDocument();
    });
  });

  describe('Progress cleared (empty localStorage)', () => {
    it('shows zero progress with no errors when localStorage is empty', () => {
      useLearnStore.getState().initialize();

      render(
        <SectionGroup subjectId="subject-1-basic-movement" title="Section" lessons={lessons} />
      );

      expect(screen.queryByText('✓')).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/sao/)).not.toBeInTheDocument();
      // Shows lesson numbers instead
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('shows zero progress after localStorage is cleared', () => {
      useLearnStore.getState().initialize();
      useLearnStore.getState().saveLessonProgress('bm-1-1', 3, 3);

      // Reset store to simulate clearing browser data
      useLearnStore.getState().reset();
      window.localStorage.clear();
      useLearnStore.getState().initialize();

      render(
        <SectionGroup subjectId="subject-1-basic-movement" title="Section" lessons={lessons} />
      );

      expect(screen.queryByText('✓')).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/sao/)).not.toBeInTheDocument();
    });
  });

  describe('localStorage unavailable', () => {
    it('falls back gracefully when localStorage throws', () => {
      // Make localStorage throw
      Object.defineProperty(window, 'localStorage', {
        configurable: true,
        value: {
          getItem: () => {
            throw new Error('localStorage unavailable');
          },
          setItem: () => {
            throw new Error('localStorage unavailable');
          },
          removeItem: () => {
            throw new Error('localStorage unavailable');
          },
          clear: () => {
            throw new Error('localStorage unavailable');
          }
        }
      });

      // Should not throw
      useLearnStore.getState().initialize();

      render(
        <SectionGroup subjectId="subject-1-basic-movement" title="Section" lessons={lessons} />
      );

      // Should render without progress and without errors
      expect(screen.queryByText('✓')).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/sao/)).not.toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument();
    });
  });

  describe('Navigation consistency', () => {
    it('preserves progress state across re-renders', () => {
      useLearnStore.getState().initialize();
      useLearnStore.getState().saveLessonProgress('bm-1-1', 2, 5);

      // First render (simulating subject page)
      const { unmount } = render(
        <SectionGroup subjectId="subject-1-basic-movement" title="Section" lessons={lessons} />
      );

      expect(screen.getByText('✓')).toBeInTheDocument();
      expect(screen.getByLabelText('2 sao')).toBeInTheDocument();

      unmount();

      // Second render (simulating navigation back)
      render(
        <SectionGroup subjectId="subject-1-basic-movement" title="Section" lessons={lessons} />
      );

      // Progress should still be visible
      expect(screen.getByText('✓')).toBeInTheDocument();
      expect(screen.getByLabelText('2 sao')).toBeInTheDocument();
    });
  });
});

describe('LessonListItem star rendering', () => {
  it('renders 0 stars correctly (3 empty stars for zero-star rating)', () => {
    render(
      <LessonListItem
        subjectId="basic-movement"
        lessonId="bm-1-1"
        title="Test"
        description="Desc"
        index={1}
        completed
        stars={0}
      />
    );
    const starContainer = screen.getByLabelText('0 sao');
    expect(starContainer).toBeInTheDocument();
    const stars = starContainer.querySelectorAll('span');
    expect(stars).toHaveLength(3);
  });

  it('renders 1 star correctly', () => {
    render(
      <LessonListItem
        subjectId="basic-movement"
        lessonId="bm-1-1"
        title="Test"
        description="Desc"
        index={1}
        completed
        stars={1}
      />
    );
    expect(screen.getByLabelText('1 sao')).toBeInTheDocument();
  });

  it('renders 2 stars correctly', () => {
    render(
      <LessonListItem
        subjectId="basic-movement"
        lessonId="bm-1-1"
        title="Test"
        description="Desc"
        index={1}
        completed
        stars={2}
      />
    );
    expect(screen.getByLabelText('2 sao')).toBeInTheDocument();
  });

  it('renders 3 stars correctly', () => {
    render(
      <LessonListItem
        subjectId="basic-movement"
        lessonId="bm-1-1"
        title="Test"
        description="Desc"
        index={1}
        completed
        stars={3}
      />
    );
    expect(screen.getByLabelText('3 sao')).toBeInTheDocument();
  });
});

describe('SubjectCard star aggregate rendering', () => {
  it('renders star aggregate alongside lesson count', () => {
    render(
      <SubjectCard
        id="basic-movement"
        title="Di chuyển"
        description="Desc"
        lessonCount={5}
        completedLessons={3}
        earnedStars={7}
        totalStars={15}
      />
    );
    expect(screen.getByText(/3\/5 bài học/)).toBeInTheDocument();
    expect(screen.getByText(/★ 7\/15/)).toBeInTheDocument();
  });

  it('does not render stars when no progress', () => {
    render(
      <SubjectCard id="basic-movement" title="Di chuyển" description="Desc" lessonCount={5} />
    );
    expect(screen.queryByText(/★/)).not.toBeInTheDocument();
  });
});
