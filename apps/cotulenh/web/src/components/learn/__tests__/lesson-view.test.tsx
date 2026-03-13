import { render, screen, act, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

// Track engine callbacks for testing
let engineCallbacks: Record<string, (...args: unknown[]) => void> = {};
let hintCallbacks: Record<string, (...args: unknown[]) => void> = {};

const mockLoadLesson = vi.fn();
const mockMakeMove = vi.fn();
const mockRestart = vi.fn();
const mockUndo = vi.fn();
const mockGetPossibleMoves = vi.fn(() => []);
const mockHintStart = vi.fn();
const mockHintStop = vi.fn();
const mockHintOnMove = vi.fn();
const mockHintOnWrongMove = vi.fn();
const mockHintReset = vi.fn();
const mockInitializeLearnStore = vi.fn();
const mockSaveLessonProgress = vi.fn();

vi.mock('@cotulenh/learn', () => ({
  createLearnEngine: (callbacks: Record<string, unknown>) => {
    engineCallbacks = callbacks as typeof engineCallbacks;
    return {
      loadLesson: mockLoadLesson,
      makeMove: mockMakeMove,
      restart: mockRestart,
      undo: mockUndo,
      getPossibleMoves: mockGetPossibleMoves,
      get fen() {
        return 'test-fen';
      },
      get hasScenario() {
        return false;
      },
      get scenario() {
        return null;
      }
    };
  },
  createHintSystem: (_config: unknown, callbacks: Record<string, unknown>) => {
    hintCallbacks = callbacks as typeof hintCallbacks;
    return {
      start: mockHintStart,
      stop: mockHintStop,
      onMove: mockHintOnMove,
      onWrongMove: mockHintOnWrongMove,
      reset: mockHintReset
    };
  },
  getLessonById: (id: string) => {
    if (id === 'test-lesson') {
      return {
        id: 'test-lesson',
        title: 'Bài test',
        description: 'Mô tả bài test',
        startFen: 'start-fen',
        instruction: 'Di chuyển quân bộ binh',
        content: 'Nội dung bài học',
        hint: 'Gợi ý: di chuyển quân ở e5',
        successMessage: 'Tuyệt vời!',
        failureMessage: 'Sai rồi!',
        showMoveCount: true,
        allowUndo: true,
        allowHints: true,
        showValidMoves: true,
        highlightSquares: ['e5'],
        arrows: [{ from: 'e5', to: 'e6', color: 'green' }]
      };
    }
    return undefined;
  },
  getLessonContext: (id: string) => {
    if (id === 'test-lesson') {
      return {
        lesson: { id: 'test-lesson' },
        subject: { id: 'test-subject' },
        section: { id: 'section-1' },
        positionInSection: 1,
        totalInSection: 5,
        positionInSubject: 2,
        totalInSubject: 10,
        prevLesson: null,
        nextLesson: { id: 'next-lesson' }
      };
    }
    return undefined;
  },
  getNextLessonInSubject: (subjectId: string, currentId: string) => {
    void subjectId;
    void currentId;
    return {
      id: 'next-lesson',
      title: 'Bài tiếp'
    };
  },
  setLearnLocale: vi.fn(),
  tLessonInstruction: (_s: string, _l: string, fallback: string) => fallback,
  tLessonContent: (_s: string, _l: string, fallback: string) => fallback,
  tLessonHint: (_s: string, _l: string, fallback: string) => fallback,
  tLessonSuccessMessage: (_s: string, _l: string, fallback: string) => fallback,
  tLessonFailureMessage: (_s: string, _l: string, fallback: string) => fallback
}));

vi.mock('@/hooks/use-board', () => ({
  useBoard: () => null // Board won't actually mount in tests
}));

vi.mock('@/hooks/use-auth-learn-progress', () => ({
  useAuthLearnProgress: () => ({
    initialized: true,
    progressVersion: 0,
    authState: 'unauthenticated',
    saveLessonProgress: mockSaveLessonProgress
  })
}));

vi.mock('@/stores/learn-store', () => ({
  useLearnStore: (
    selector: (state: {
      initialize: typeof mockInitializeLearnStore;
      saveLessonProgress: typeof mockSaveLessonProgress;
      getTotalCompletedCount: () => number;
    }) => unknown
  ) =>
    selector({
      initialize: mockInitializeLearnStore,
      saveLessonProgress: mockSaveLessonProgress,
      getTotalCompletedCount: () => 0
    })
}));

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  value: vi.fn().mockImplementation(() => ({ matches: false }))
});

const localStorageState = new Map<string, string>();
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: (key: string) => localStorageState.get(key) ?? null,
    setItem: (key: string, value: string) => {
      localStorageState.set(key, value);
    },
    removeItem: (key: string) => {
      localStorageState.delete(key);
    },
    clear: () => {
      localStorageState.clear();
    }
  }
});

import { LessonView } from '../lesson-view';

describe('LessonView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    engineCallbacks = {};
    hintCallbacks = {};
    window.localStorage.clear();
  });

  it('renders instruction text', () => {
    render(<LessonView lessonId="test-lesson" subjectId="test-subject" />);
    expect(screen.getByText('Di chuyển quân bộ binh')).toBeInTheDocument();
  });

  it('renders content text', () => {
    render(<LessonView lessonId="test-lesson" subjectId="test-subject" />);
    expect(screen.getByText('Nội dung bài học')).toBeInTheDocument();
  });

  it('renders lesson position indicator', () => {
    render(<LessonView lessonId="test-lesson" subjectId="test-subject" />);
    expect(screen.getByText('Bài 2/10')).toBeInTheDocument();
  });

  it('initializes engine with lesson', () => {
    render(<LessonView lessonId="test-lesson" subjectId="test-subject" />);
    expect(mockLoadLesson).toHaveBeenCalledWith('test-lesson');
  });

  it('initializes learn progress store on mount', () => {
    render(<LessonView lessonId="test-lesson" subjectId="test-subject" />);
    expect(mockInitializeLearnStore).toHaveBeenCalled();
  });

  it('initializes hint system and starts it', () => {
    render(<LessonView lessonId="test-lesson" subjectId="test-subject" />);
    expect(mockHintStart).toHaveBeenCalled();
  });

  it('renders action buttons (hint, undo, restart)', () => {
    render(<LessonView lessonId="test-lesson" subjectId="test-subject" />);
    expect(screen.getByText('Gợi ý')).toBeInTheDocument();
    expect(screen.getByText('Hoàn tác')).toBeInTheDocument();
    expect(screen.getByText('Làm lại')).toBeInTheDocument();
  });

  it('returns null for unknown lesson', () => {
    const { container } = render(<LessonView lessonId="nonexistent" subjectId="test-subject" />);
    expect(container.firstChild).toBeNull();
  });

  it('handles completion callback', () => {
    render(<LessonView lessonId="test-lesson" subjectId="test-subject" />);

    act(() => {
      engineCallbacks.onComplete?.({
        lessonId: 'test-lesson',
        moveCount: 3,
        stars: 2,
        completed: true
      });
    });

    expect(screen.getByText('Tuyệt vời!')).toBeInTheDocument();
    expect(screen.getByText('Bài tiếp theo')).toBeInTheDocument();
    expect(mockSaveLessonProgress).toHaveBeenCalledWith('test-lesson', 2, 3);
  });

  it('handles failure callback with error message', () => {
    render(<LessonView lessonId="test-lesson" subjectId="test-subject" />);

    act(() => {
      engineCallbacks.onFail?.('e6', 'e7');
    });

    expect(screen.getByRole('alert')).toHaveTextContent('Sai rồi!');
    expect(mockHintOnWrongMove).toHaveBeenCalled();
  });

  it('shows move count on move callback', () => {
    render(<LessonView lessonId="test-lesson" subjectId="test-subject" />);

    act(() => {
      engineCallbacks.onMove?.(1, 'new-fen');
    });

    expect(screen.getByText('Số nước: 1')).toBeInTheDocument();
  });

  it('calls engine restart on restart button click', () => {
    render(<LessonView lessonId="test-lesson" subjectId="test-subject" />);

    fireEvent.click(screen.getByText('Làm lại'));
    expect(mockRestart).toHaveBeenCalled();
  });

  it('calls engine undo on undo button click', () => {
    render(<LessonView lessonId="test-lesson" subjectId="test-subject" />);

    fireEvent.click(screen.getByText('Hoàn tác'));
    expect(mockUndo).toHaveBeenCalled();
  });

  it('replays saved moves from local storage', () => {
    window.localStorage.setItem(
      'cotulenh.lesson-session.test-subject.test-lesson',
      JSON.stringify({
        moves: [{ orig: 'e5', dest: 'e6' }]
      })
    );

    render(<LessonView lessonId="test-lesson" subjectId="test-subject" />);

    expect(mockMakeMove).toHaveBeenCalledWith('e5', 'e6', undefined);
  });

  it('shows hint on hint button click', () => {
    render(<LessonView lessonId="test-lesson" subjectId="test-subject" />);

    const hintButton = screen.getByRole('button', { name: 'Gợi ý' });

    fireEvent.click(hintButton);
    expect(screen.queryByRole('status')).toBeNull();

    fireEvent.click(hintButton);
    expect(screen.queryByRole('status')).toBeNull();

    fireEvent.click(hintButton);
    expect(screen.getByRole('status')).toHaveTextContent('Gợi ý: di chuyển quân ở e5');
  });

  it('hides action buttons after completion', () => {
    render(<LessonView lessonId="test-lesson" subjectId="test-subject" />);

    act(() => {
      engineCallbacks.onComplete?.({
        lessonId: 'test-lesson',
        moveCount: 3,
        stars: 2,
        completed: true
      });
    });

    // Action buttons should be gone
    expect(screen.queryByText('Hoàn tác')).not.toBeInTheDocument();
  });

  it('has ARIA live region for accessibility', () => {
    render(<LessonView lessonId="test-lesson" subjectId="test-subject" />);
    const liveRegion = document.querySelector('[aria-live="polite"]');
    expect(liveRegion).toBeInTheDocument();
  });

  it('has board container with proper aria-label', () => {
    render(<LessonView lessonId="test-lesson" subjectId="test-subject" />);
    expect(screen.getByRole('application', { name: 'Bàn cờ tư lệnh' })).toBeInTheDocument();
  });

  it('renders back link to subject in completion', () => {
    render(<LessonView lessonId="test-lesson" subjectId="test-subject" />);

    act(() => {
      engineCallbacks.onComplete?.({
        lessonId: 'test-lesson',
        moveCount: 1,
        stars: 3,
        completed: true
      });
    });

    expect(screen.getByText('Quay lại danh sách bài học')).toBeInTheDocument();
  });

  it('handles hint system callbacks', () => {
    render(<LessonView lessonId="test-lesson" subjectId="test-subject" />);

    act(() => {
      hintCallbacks.onHintChange?.('explicit', 'show-instruction');
    });

    expect(screen.getByRole('status')).toHaveTextContent('Gợi ý: di chuyển quân ở e5');
  });

  it('clears hints on pulse-target level', () => {
    render(<LessonView lessonId="test-lesson" subjectId="test-subject" />);

    // First show a hint
    act(() => {
      hintCallbacks.onHintChange?.('explicit', 'show-instruction');
    });
    expect(screen.getByRole('status')).toHaveTextContent('Gợi ý: di chuyển quân ở e5');

    // Then pulse-target should clear the text hint
    act(() => {
      hintCallbacks.onHintChange?.('subtle', 'pulse-target');
    });
    // HintDisplay returns null when text is null, so the status element should be gone
    expect(screen.queryByRole('status')).toBeNull();
  });
});
