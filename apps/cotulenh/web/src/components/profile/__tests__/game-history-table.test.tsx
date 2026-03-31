import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { GameHistoryTable } from '../game-history-table';
import type { GameHistoryEntry } from '@/lib/game-history';

const games: GameHistoryEntry[] = [
  {
    id: 'game-1',
    opponentDisplayName: 'Nguoi choi A',
    opponentRating: 1610,
    opponentRatingGamesPlayed: 42,
    result: 'win',
    resultReason: 'checkmate',
    resultReasonLabel: 'Chiếu hết',
    timeControl: '15+10',
    endedAt: '2026-03-31T10:00:00Z',
    relativeDate: '2 giờ trước'
  },
  {
    id: 'game-2',
    opponentDisplayName: 'Nguoi choi B',
    opponentRating: 1498,
    opponentRatingGamesPlayed: 12,
    result: 'loss',
    resultReason: 'timeout',
    resultReasonLabel: 'Hết giờ',
    timeControl: '5+0',
    endedAt: '2026-03-30T10:00:00Z',
    relativeDate: '1 ngày trước'
  },
  {
    id: 'game-3',
    opponentDisplayName: 'Nguoi choi C',
    opponentRating: 1500,
    opponentRatingGamesPlayed: 5,
    result: 'draw',
    resultReason: 'stalemate',
    resultReasonLabel: 'Hòa bí',
    timeControl: '10+5',
    endedAt: '2026-03-29T10:00:00Z',
    relativeDate: '2 ngày trước'
  }
];

describe('GameHistoryTable', () => {
  it('renders rows for game history entries', () => {
    render(<GameHistoryTable games={games} page={1} totalPages={1} />);

    expect(screen.getByTestId('history-row-game-1')).toBeInTheDocument();
    expect(screen.getByTestId('history-row-game-2')).toBeInTheDocument();
    expect(screen.getByTestId('history-row-game-3')).toBeInTheDocument();
  });

  it('renders mobile cards for game history entries', () => {
    render(<GameHistoryTable games={games} page={1} totalPages={1} />);

    expect(screen.getByTestId('history-card-game-1')).toBeInTheDocument();
    expect(screen.getByTestId('history-card-game-2')).toBeInTheDocument();
    expect(screen.getByTestId('history-card-game-3')).toBeInTheDocument();
  });

  it('displays opponent names', () => {
    render(<GameHistoryTable games={games} page={1} totalPages={1} />);

    expect(screen.getAllByText(/Nguoi choi A/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Nguoi choi B/).length).toBeGreaterThan(0);
  });

  it('uses Vietnamese mobile label for opponent', () => {
    render(<GameHistoryTable games={games} page={1} totalPages={1} />);

    expect(screen.getByText(/đấu với Nguoi choi A/i)).toBeInTheDocument();
    expect(screen.queryByText(/^vs\s/i)).not.toBeInTheDocument();
  });

  it('displays result labels', () => {
    render(<GameHistoryTable games={games} page={1} totalPages={1} />);

    expect(screen.getAllByText('Thắng').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Thua').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Hòa').length).toBeGreaterThan(0);
  });

  it('displays result reason labels', () => {
    render(<GameHistoryTable games={games} page={1} totalPages={1} />);

    expect(screen.getAllByText('Chiếu hết').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Hết giờ').length).toBeGreaterThan(0);
  });

  it('displays provisional rating marker for low game count', () => {
    render(<GameHistoryTable games={games} page={1} totalPages={1} />);

    // Nguoi choi B has 12 games played (< 30), so should show "1498?"
    expect(screen.getAllByText(/1498\?/).length).toBeGreaterThan(0);
    // Nguoi choi A has 42 games played (>= 30), so should show "1610" without "?"
    expect(screen.getAllByText(/1610/).length).toBeGreaterThan(0);
  });

  it('links to game pages', () => {
    render(<GameHistoryTable games={games} page={1} totalPages={1} />);

    const links = screen.getAllByRole('link');
    const gameLinks = links.filter((link) => link.getAttribute('href')?.includes('/game/game-1'));
    expect(gameLinks.length).toBeGreaterThan(0);
  });

  it('uses full-cell links on desktop rows', () => {
    render(<GameHistoryTable games={games} page={1} totalPages={1} />);

    const resultLink = screen.getAllByRole('link', { name: 'Thắng' })[0];
    expect(resultLink.className).toContain('block');
    expect(resultLink.className).toContain('px-[var(--space-3)]');
  });

  it('shows pagination controls when there is more than one page', () => {
    render(<GameHistoryTable games={games} page={2} totalPages={3} />);

    expect(screen.getByRole('link', { name: 'Trang trước' })).toHaveAttribute(
      'href',
      '/game-history?page=1'
    );
    expect(screen.getByRole('link', { name: 'Trang sau' })).toHaveAttribute(
      'href',
      '/game-history?page=3'
    );
  });

  it('hides pagination when there is only one page', () => {
    render(<GameHistoryTable games={games} page={1} totalPages={1} />);

    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  });

  it('disables previous button on first page', () => {
    render(<GameHistoryTable games={games} page={1} totalPages={3} />);

    const prevLink = screen.getByRole('link', { name: 'Trang trước' });
    expect(prevLink.className).toContain('pointer-events-none');
  });

  it('disables next button on last page', () => {
    render(<GameHistoryTable games={games} page={3} totalPages={3} />);

    const nextLink = screen.getByRole('link', { name: 'Trang sau' });
    expect(nextLink.className).toContain('pointer-events-none');
  });

  it('applies win color class', () => {
    render(<GameHistoryTable games={games} page={1} totalPages={1} />);

    const row = screen.getByTestId('history-row-game-1');
    expect(row.className).toContain('bg-[var(--color-success)]');
  });

  it('applies loss color class', () => {
    render(<GameHistoryTable games={games} page={1} totalPages={1} />);

    const row = screen.getByTestId('history-row-game-2');
    expect(row.className).toContain('bg-[var(--color-error)]');
  });
});
