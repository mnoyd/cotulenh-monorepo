import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useBoard } from '../use-board';

const mockSet = vi.fn();
const mockSetShapes = vi.fn();
const mockMove = vi.fn();
const mockDestroy = vi.fn();
const mockApi = {
  set: mockSet,
  setShapes: mockSetShapes,
  move: mockMove,
  destroy: mockDestroy,
  state: {},
  toggleOrientation: vi.fn(),
  getFen: vi.fn(() => ''),
  setPieces: vi.fn(),
  newPiece: vi.fn(),
  redrawAll: vi.fn(),
  dragNewPiece: vi.fn(),
  setDropMode: vi.fn()
};

const mockCotulenhBoard = vi.fn(() => mockApi);

vi.mock('@cotulenh/board', () => ({
  CotulenhBoard: (...args: Parameters<typeof mockCotulenhBoard>) => mockCotulenhBoard(...args)
}));

describe('useBoard', () => {
  let containerElement: HTMLDivElement;

  beforeEach(() => {
    vi.clearAllMocks();
    containerElement = document.createElement('div');
    document.body.appendChild(containerElement);
  });

  afterEach(() => {
    containerElement.remove();
  });

  it('should mount the board when ref is set', async () => {
    const ref = { current: containerElement };
    const config = { fen: 'some-fen', orientation: 'red' as const };

    const { result } = renderHook(() => useBoard(ref, config));

    await waitFor(() => {
      expect(result.current).not.toBeNull();
    });

    expect(mockCotulenhBoard).toHaveBeenCalledWith(containerElement, config);
  });

  it('should not mount when ref is null', async () => {
    const ref = { current: null };

    const { result } = renderHook(() => useBoard(ref, {}));

    // Give time for potential async operations
    await new Promise((r) => setTimeout(r, 50));

    expect(mockCotulenhBoard).not.toHaveBeenCalled();
    expect(result.current).toBeNull();
  });

  it('should expose setFen method', async () => {
    const ref = { current: containerElement };
    const { result } = renderHook(() => useBoard(ref, {}));

    await waitFor(() => {
      expect(result.current).not.toBeNull();
    });

    act(() => {
      result.current!.setFen('new-fen');
    });

    expect(mockSet).toHaveBeenCalledWith({ fen: 'new-fen' });
  });

  it('should expose setDests method', async () => {
    const ref = { current: containerElement };
    const { result } = renderHook(() => useBoard(ref, {}));

    await waitFor(() => {
      expect(result.current).not.toBeNull();
    });

    const dests = new Map();
    act(() => {
      result.current!.setDests(dests);
    });

    expect(mockSet).toHaveBeenCalledWith({ movable: { dests } });
  });

  it('should expose setShapes method', async () => {
    const ref = { current: containerElement };
    const { result } = renderHook(() => useBoard(ref, {}));

    await waitFor(() => {
      expect(result.current).not.toBeNull();
    });

    const shapes = [{ orig: 'e4', brush: 'green' }];
    act(() => {
      result.current!.setShapes(shapes as never);
    });

    expect(mockSetShapes).toHaveBeenCalledWith(shapes);
  });

  it('should expose setHighlight method', async () => {
    const ref = { current: containerElement };
    const { result } = renderHook(() => useBoard(ref, {}));

    await waitFor(() => {
      expect(result.current).not.toBeNull();
    });

    const highlights = new Map([['e4', 'highlight']]);
    act(() => {
      result.current!.setHighlight(highlights);
    });

    expect(mockSet).toHaveBeenCalledWith({ highlight: { custom: highlights } });
  });

  it('should expose move method', async () => {
    const ref = { current: containerElement };
    const { result } = renderHook(() => useBoard(ref, {}));

    await waitFor(() => {
      expect(result.current).not.toBeNull();
    });

    const orig = { square: 'e2' as const, type: 'infantry' as const };
    const dest = { square: 'e4' as const };
    act(() => {
      result.current!.move(orig as never, dest as never);
    });

    expect(mockMove).toHaveBeenCalledWith(orig, dest);
  });

  it('should call destroy on unmount', async () => {
    const ref = { current: containerElement };
    const { result, unmount } = renderHook(() => useBoard(ref, {}));

    await waitFor(() => {
      expect(result.current).not.toBeNull();
    });

    unmount();

    expect(mockDestroy).toHaveBeenCalled();
  });

  it('should update board config when config changes', async () => {
    const ref = { current: containerElement };
    const { result, rerender } = renderHook(({ config }) => useBoard(ref, config), {
      initialProps: { config: { fen: 'fen1' } }
    });

    await waitFor(() => {
      expect(result.current).not.toBeNull();
    });

    mockCotulenhBoard.mockClear();
    mockDestroy.mockClear();
    mockSet.mockClear();

    rerender({ config: { fen: 'fen2' } });

    await waitFor(() => {
      expect(mockSet).toHaveBeenCalledWith({ fen: 'fen2' });
    });

    expect(mockCotulenhBoard).not.toHaveBeenCalled();
    expect(mockDestroy).not.toHaveBeenCalled();
  });
});
