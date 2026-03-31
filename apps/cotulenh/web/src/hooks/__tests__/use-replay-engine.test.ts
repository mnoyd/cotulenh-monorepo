import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useReplayEngine } from '../use-replay-engine';

const mockFen = vi.fn();
const mockMove = vi.fn();

vi.mock('@cotulenh/core', () => {
  const DEFAULT_POSITION = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR r - - 0 1';
  return {
    CoTuLenh: vi.fn().mockImplementation(() => ({
      fen: mockFen,
      move: mockMove
    })),
    DEFAULT_POSITION
  };
});

describe('useReplayEngine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    let callCount = 0;
    mockFen.mockImplementation(() => {
      callCount++;
      return `fen-after-move-${callCount}`;
    });
    mockMove.mockReturnValue({ san: 'e2e4' }); // non-null = valid move
  });

  it('returns start position FEN for empty move history', () => {
    const { result } = renderHook(() => useReplayEngine([]));

    expect(result.current.totalMoves).toBe(0);
    expect(result.current.currentIndex).toBe(0);
    // With empty history, currentFen should be the initial FEN (from engine before any moves)
    expect(result.current.currentFen).toBeDefined();
  });

  it('pre-computes FENs for single move history', () => {
    const { result } = renderHook(() => useReplayEngine(['e2e4']));

    expect(result.current.totalMoves).toBe(1);
    // Should start at final position
    expect(result.current.currentIndex).toBe(1);
    expect(mockMove).toHaveBeenCalledWith('e2e4');
  });

  it('pre-computes FENs for multi-move history', () => {
    const moves = ['e2e4', 'd7d5', 'Nc3i10'];
    const { result } = renderHook(() => useReplayEngine(moves));

    expect(result.current.totalMoves).toBe(3);
    expect(result.current.currentIndex).toBe(3);
    expect(mockMove).toHaveBeenCalledTimes(3);
    expect(mockMove).toHaveBeenNthCalledWith(1, 'e2e4');
    expect(mockMove).toHaveBeenNthCalledWith(2, 'd7d5');
    expect(mockMove).toHaveBeenNthCalledWith(3, 'Nc3i10');
  });

  it('navigates to specific move index with goTo', () => {
    const { result } = renderHook(() => useReplayEngine(['e2e4', 'd7d5']));

    act(() => {
      result.current.goTo(0);
    });

    expect(result.current.currentIndex).toBe(0);
  });

  it('goFirst navigates to index 0', () => {
    const { result } = renderHook(() => useReplayEngine(['e2e4', 'd7d5']));

    expect(result.current.currentIndex).toBe(2); // starts at final

    act(() => {
      result.current.goFirst();
    });

    expect(result.current.currentIndex).toBe(0);
  });

  it('goLast navigates to final move', () => {
    const { result } = renderHook(() => useReplayEngine(['e2e4', 'd7d5']));

    act(() => {
      result.current.goFirst();
    });
    expect(result.current.currentIndex).toBe(0);

    act(() => {
      result.current.goLast();
    });
    expect(result.current.currentIndex).toBe(2);
  });

  it('goPrev decrements index but clamps at 0', () => {
    const { result } = renderHook(() => useReplayEngine(['e2e4', 'd7d5']));

    act(() => {
      result.current.goTo(1);
    });
    expect(result.current.currentIndex).toBe(1);

    act(() => {
      result.current.goPrev();
    });
    expect(result.current.currentIndex).toBe(0);

    // Should not go below 0
    act(() => {
      result.current.goPrev();
    });
    expect(result.current.currentIndex).toBe(0);
  });

  it('goNext increments index but clamps at totalMoves', () => {
    const { result } = renderHook(() => useReplayEngine(['e2e4', 'd7d5']));

    act(() => {
      result.current.goTo(0);
    });

    act(() => {
      result.current.goNext();
    });
    expect(result.current.currentIndex).toBe(1);

    act(() => {
      result.current.goNext();
    });
    expect(result.current.currentIndex).toBe(2);

    // Should not go above totalMoves
    act(() => {
      result.current.goNext();
    });
    expect(result.current.currentIndex).toBe(2);
  });

  it('goTo clamps out-of-range indices', () => {
    const { result } = renderHook(() => useReplayEngine(['e2e4']));

    act(() => {
      result.current.goTo(-5);
    });
    expect(result.current.currentIndex).toBe(0);

    act(() => {
      result.current.goTo(100);
    });
    expect(result.current.currentIndex).toBe(1);
  });

  it('handles invalid move gracefully (stops replay at failure point)', () => {
    mockMove
      .mockReturnValueOnce({ san: 'e2e4' }) // first move succeeds
      .mockReturnValueOnce(null); // second move fails

    const { result } = renderHook(() => useReplayEngine(['e2e4', 'invalid']));

    // Should only have 1 successfully replayed move
    expect(result.current.totalMoves).toBe(1);
    expect(result.current.currentIndex).toBe(1);
  });

  it('returns lastMoveSan for current position', () => {
    const { result } = renderHook(() => useReplayEngine(['e2e4', 'd7d5']));

    // At final position (index 2), last move is d7d5
    expect(result.current.lastMoveSan).toBe('d7d5');

    act(() => {
      result.current.goTo(1);
    });
    // At index 1, last move is e2e4
    expect(result.current.lastMoveSan).toBe('e2e4');

    act(() => {
      result.current.goTo(0);
    });
    // At start position, no last move
    expect(result.current.lastMoveSan).toBeNull();
  });

  it('exposes fenAtIndex with clamped lookup', () => {
    const { result } = renderHook(() => useReplayEngine(['e2e4', 'd7d5']));

    expect(result.current.fenAtIndex(0)).toBe('fen-after-move-1');
    expect(result.current.fenAtIndex(1)).toBe('fen-after-move-2');
    expect(result.current.fenAtIndex(999)).toBe('fen-after-move-3');
  });

  it('clamps currentIndex when move history shrinks', () => {
    const { result, rerender } = renderHook(({ history }) => useReplayEngine(history), {
      initialProps: { history: ['e2e4', 'd7d5'] }
    });

    expect(result.current.currentIndex).toBe(2);

    rerender({ history: [] });
    expect(result.current.currentIndex).toBe(0);
  });
});
