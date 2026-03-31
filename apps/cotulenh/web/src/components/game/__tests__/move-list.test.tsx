import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { MoveList } from '../move-list';

describe('MoveList', () => {
  it('shows empty state when no moves', () => {
    render(<MoveList moveHistory={[]} />);
    expect(screen.getByText('Chua co nuoc di nao')).toBeTruthy();
  });

  it('renders moves in two-column format', () => {
    render(<MoveList moveHistory={['e2e4', 'd7d5', 'g1f3', 'b8c6']} />);

    // Check move numbers
    expect(screen.getByText('1.')).toBeTruthy();
    expect(screen.getByText('2.')).toBeTruthy();

    // Check moves are rendered
    expect(screen.getByText('e2e4')).toBeTruthy();
    expect(screen.getByText('d7d5')).toBeTruthy();
    expect(screen.getByText('g1f3')).toBeTruthy();
    expect(screen.getByText('b8c6')).toBeTruthy();
  });

  it('handles odd number of moves (incomplete pair)', () => {
    render(<MoveList moveHistory={['e2e4', 'd7d5', 'g1f3']} />);

    expect(screen.getByText('1.')).toBeTruthy();
    expect(screen.getByText('2.')).toBeTruthy();
    expect(screen.getByText('e2e4')).toBeTruthy();
    expect(screen.getByText('g1f3')).toBeTruthy();
  });

  it('highlights the last move', () => {
    render(<MoveList moveHistory={['e2e4', 'd7d5']} />);

    const lastMoveCell = screen.getByText('d7d5');
    expect(lastMoveCell.className).toContain('font-bold');
  });

  it('renders single move correctly', () => {
    render(<MoveList moveHistory={['e2e4']} />);

    expect(screen.getByText('1.')).toBeTruthy();
    expect(screen.getByText('e2e4')).toBeTruthy();
  });

  describe('interactive mode (review)', () => {
    it('renders a clickable start-position row', () => {
      const onMoveClick = vi.fn();
      render(
        <MoveList moveHistory={['e2e4', 'd7d5']} currentMoveIndex={2} onMoveClick={onMoveClick} />
      );

      const startRow = screen.getByText('Vi tri ban dau');
      expect(startRow).toBeTruthy();

      fireEvent.click(startRow);
      expect(onMoveClick).toHaveBeenCalledWith(0);
    });

    it('highlights move at currentMoveIndex instead of last move', () => {
      render(<MoveList moveHistory={['e2e4', 'd7d5', 'g1f3']} currentMoveIndex={1} />);

      // Red move at row 1 = index 1, should be highlighted
      const redMove = screen.getByText('e2e4');
      expect(redMove.className).toContain('font-bold');

      // Last move (g1f3) should NOT be highlighted
      const lastMove = screen.getByText('g1f3');
      expect(lastMove.className).not.toContain('font-bold');
    });

    it('calls onMoveClick with correct index when clicking a move', () => {
      const onMoveClick = vi.fn();
      render(
        <MoveList
          moveHistory={['e2e4', 'd7d5', 'g1f3']}
          currentMoveIndex={3}
          onMoveClick={onMoveClick}
        />
      );

      // Click red move at row 1 → index 1
      fireEvent.click(screen.getByText('e2e4'));
      expect(onMoveClick).toHaveBeenCalledWith(1);

      // Click blue move at row 1 → index 2
      fireEvent.click(screen.getByText('d7d5'));
      expect(onMoveClick).toHaveBeenCalledWith(2);
    });

    it('adds cursor-pointer class when onMoveClick is provided', () => {
      render(
        <MoveList moveHistory={['e2e4', 'd7d5']} currentMoveIndex={2} onMoveClick={vi.fn()} />
      );

      const cell = screen.getByText('e2e4');
      expect(cell.className).toContain('cursor-pointer');
    });

    it('does not add cursor-pointer when onMoveClick is not provided', () => {
      render(<MoveList moveHistory={['e2e4', 'd7d5']} />);

      const cell = screen.getByText('e2e4');
      expect(cell.className).not.toContain('cursor-pointer');
    });
  });
});
