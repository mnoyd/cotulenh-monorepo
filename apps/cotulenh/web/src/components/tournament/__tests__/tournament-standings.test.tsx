import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { TournamentStanding } from '@/lib/types/tournament';

import { TournamentStandings } from '../tournament-standings';

const mockStandings: TournamentStanding[] = [
  { player_id: 'user-1', player_name: 'Player A', score: 3, games_played: 3 },
  { player_id: 'user-2', player_name: 'Player B', score: 2, games_played: 3 },
  { player_id: 'user-3', player_name: 'Player C', score: 1, games_played: 2 }
];

describe('TournamentStandings', () => {
  it('renders empty state when no standings', () => {
    render(<TournamentStandings standings={[]} isActive={false} />);
    expect(screen.getByText('Chua co ket qua')).toBeInTheDocument();
  });

  it('renders standings table with all players', () => {
    render(<TournamentStandings standings={mockStandings} isActive={false} />);

    expect(screen.getByText('Player A')).toBeInTheDocument();
    expect(screen.getByText('Player B')).toBeInTheDocument();
    expect(screen.getByText('Player C')).toBeInTheDocument();
  });

  it('renders column headers', () => {
    render(<TournamentStandings standings={mockStandings} isActive={false} />);

    expect(screen.getByText('Hang')).toBeInTheDocument();
    expect(screen.getByText('Nguoi choi')).toBeInTheDocument();
    expect(screen.getByText('Diem')).toBeInTheDocument();
    expect(screen.getByText('Van')).toBeInTheDocument();
  });

  it('highlights current user row', () => {
    render(
      <TournamentStandings standings={mockStandings} currentUserId="user-2" isActive={false} />
    );

    const currentUserRow = screen.getByTestId('current-user-row');
    expect(currentUserRow).toBeInTheDocument();
    expect(currentUserRow).toHaveTextContent('Player B');
  });

  it('does not highlight any row when no current user', () => {
    render(<TournamentStandings standings={mockStandings} isActive={false} />);

    expect(screen.queryByTestId('current-user-row')).not.toBeInTheDocument();
  });

  it('shows between-rounds banner when tournament is active', () => {
    render(<TournamentStandings standings={mockStandings} isActive={true} />);

    expect(screen.getByTestId('between-rounds-banner')).toBeInTheDocument();
    expect(screen.getByText('Dang tim doi thu...')).toBeInTheDocument();
  });

  it('shows between-rounds banner even when standings are empty', () => {
    render(<TournamentStandings standings={[]} isActive={true} />);

    expect(screen.getByTestId('between-rounds-banner')).toBeInTheDocument();
    expect(screen.getByText('Dang tim doi thu...')).toBeInTheDocument();
    expect(screen.getByText('Chua co ket qua')).toBeInTheDocument();
  });

  it('does not show between-rounds banner when tournament is not active', () => {
    render(<TournamentStandings standings={mockStandings} isActive={false} />);

    expect(screen.queryByTestId('between-rounds-banner')).not.toBeInTheDocument();
  });

  it('displays correct rank numbers', () => {
    render(<TournamentStandings standings={mockStandings} isActive={false} />);

    const rows = screen.getAllByRole('row');
    // First row is header, subsequent are data
    expect(rows[1]).toHaveTextContent('1');
    expect(rows[2]).toHaveTextContent('2');
    expect(rows[3]).toHaveTextContent('3');
  });

  it('displays score and games_played values', () => {
    render(<TournamentStandings standings={mockStandings} isActive={false} />);

    // Player A: score 3, games 3
    const rows = screen.getAllByRole('row');
    expect(rows[1]).toHaveTextContent('3'); // score
    expect(rows[1]).toHaveTextContent('Player A');
  });
});
