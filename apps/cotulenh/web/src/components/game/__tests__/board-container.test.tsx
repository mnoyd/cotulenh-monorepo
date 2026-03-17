import { render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BoardContainerInner } from '../board-container';

type MockPiece = { color: 'red' | 'blue'; role: string };

const pieceMap = new Map<string, MockPiece>();

vi.mock('@/hooks/use-board', () => ({
  useBoard: () => ({
    getState: () => ({ pieces: pieceMap })
  })
}));

describe('BoardContainerInner', () => {
  beforeEach(() => {
    pieceMap.clear();
  });

  it('sets keyboard focus and aria-label on board squares', async () => {
    const { container } = render(<BoardContainerInner fen="start" orientation="red" />);
    const boardRoot = container.querySelector('[role="application"]') as HTMLElement;

    const square = document.createElement('square') as HTMLElement & { cgKey?: string };
    square.cgKey = 'b4';
    pieceMap.set('b4', { color: 'red', role: 'infantry' });
    boardRoot.appendChild(square);

    await waitFor(() => {
      expect(square.tabIndex).toBe(0);
      expect(square.getAttribute('role')).toBe('button');
      expect(square.getAttribute('aria-label')).toBe('b4: Bo binh Do');
    });
  });

  it('refreshes aria-labels when board state changes', async () => {
    const { container, rerender } = render(<BoardContainerInner fen="start" orientation="red" />);
    const boardRoot = container.querySelector('[role="application"]') as HTMLElement;

    const square = document.createElement('square') as HTMLElement & { cgKey?: string };
    square.cgKey = 'b4';
    pieceMap.set('b4', { color: 'red', role: 'infantry' });
    boardRoot.appendChild(square);

    await waitFor(() => {
      expect(square.getAttribute('aria-label')).toBe('b4: Bo binh Do');
    });

    pieceMap.set('b4', { color: 'blue', role: 'tank' });
    rerender(<BoardContainerInner fen="next-position" orientation="red" />);

    await waitFor(() => {
      expect(square.getAttribute('aria-label')).toBe('b4: Xe tang Xanh');
    });
  });
});
