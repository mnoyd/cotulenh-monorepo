import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

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
});
