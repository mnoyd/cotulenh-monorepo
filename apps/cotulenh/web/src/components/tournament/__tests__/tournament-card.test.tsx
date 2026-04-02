import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TournamentCard } from '../tournament-card';
import type { Tournament } from '@/lib/types/tournament';

const baseTournament: Tournament = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  title: 'Giải đấu nhanh',
  time_control: '3+2',
  start_time: new Date(Date.now() + 3600000).toISOString(),
  duration_minutes: 60,
  status: 'upcoming',
  participant_count: 12,
  standings: [],
  current_round: 0,
  created_at: '2026-04-01T00:00:00Z',
  updated_at: '2026-04-01T00:00:00Z'
};

describe('TournamentCard', () => {
  const onJoin = vi.fn().mockResolvedValue({ success: true });
  const onLeave = vi.fn().mockResolvedValue({ success: true });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders tournament info', () => {
    render(
      <TournamentCard
        tournament={baseTournament}
        isJoined={false}
        onJoin={onJoin}
        onLeave={onLeave}
      />
    );

    expect(screen.getByText('Giải đấu nhanh')).toBeInTheDocument();
    expect(screen.getByText('3+2')).toBeInTheDocument();
    expect(screen.getByText('12 người chơi')).toBeInTheDocument();
    expect(screen.getByText('60 phút')).toBeInTheDocument();
    expect(screen.getByText('Sắp diễn ra')).toBeInTheDocument();
  });

  it('shows join button when not joined', () => {
    render(
      <TournamentCard
        tournament={baseTournament}
        isJoined={false}
        onJoin={onJoin}
        onLeave={onLeave}
      />
    );

    expect(screen.getByTestId('join-button')).toHaveTextContent('Tham gia');
  });

  it('shows leave button when joined', () => {
    render(
      <TournamentCard
        tournament={baseTournament}
        isJoined={true}
        onJoin={onJoin}
        onLeave={onLeave}
      />
    );

    expect(screen.getByTestId('leave-button')).toHaveTextContent('Rời giải');
  });

  it('calls onJoin when join button clicked', async () => {
    render(
      <TournamentCard
        tournament={baseTournament}
        isJoined={false}
        onJoin={onJoin}
        onLeave={onLeave}
      />
    );

    fireEvent.click(screen.getByTestId('join-button'));
    await waitFor(() => {
      expect(onJoin).toHaveBeenCalledWith(baseTournament.id);
    });
  });

  it('calls onLeave when leave button clicked', async () => {
    render(
      <TournamentCard
        tournament={baseTournament}
        isJoined={true}
        onJoin={onJoin}
        onLeave={onLeave}
      />
    );

    fireEvent.click(screen.getByTestId('leave-button'));
    await waitFor(() => {
      expect(onLeave).toHaveBeenCalledWith(baseTournament.id);
    });
  });

  it('does not show join/leave button for active tournaments', () => {
    const activeTournament = { ...baseTournament, status: 'active' as const };
    render(
      <TournamentCard
        tournament={activeTournament}
        isJoined={false}
        onJoin={onJoin}
        onLeave={onLeave}
      />
    );

    expect(screen.queryByTestId('join-button')).not.toBeInTheDocument();
    expect(screen.queryByTestId('leave-button')).not.toBeInTheDocument();
  });

  it('does not show join/leave button for completed tournaments', () => {
    const completedTournament = { ...baseTournament, status: 'completed' as const };
    render(
      <TournamentCard
        tournament={completedTournament}
        isJoined={false}
        onJoin={onJoin}
        onLeave={onLeave}
      />
    );

    expect(screen.queryByTestId('join-button')).not.toBeInTheDocument();
    expect(screen.queryByTestId('leave-button')).not.toBeInTheDocument();
  });

  it('shows status labels correctly', () => {
    const { rerender } = render(
      <TournamentCard
        tournament={{ ...baseTournament, status: 'active' }}
        isJoined={false}
        onJoin={onJoin}
        onLeave={onLeave}
      />
    );
    expect(screen.getByText('Đang diễn ra')).toBeInTheDocument();

    rerender(
      <TournamentCard
        tournament={{ ...baseTournament, status: 'completed' }}
        isJoined={false}
        onJoin={onJoin}
        onLeave={onLeave}
      />
    );
    expect(screen.getByText('Đã kết thúc')).toBeInTheDocument();
  });
});
