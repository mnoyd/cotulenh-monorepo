import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import type { Tournament } from '@/lib/types/tournament';

// Mock supabase browser client
vi.mock('@/lib/supabase/browser', () => ({
  createClient: () => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null } })
    },
    from: () => ({
      select: () => ({
        eq: () => Promise.resolve({ data: [] })
      })
    }),
    channel: () => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis()
    }),
    removeChannel: vi.fn()
  })
}));

// Mock tournament actions
vi.mock('@/lib/actions/tournament', () => ({
  getTournaments: vi.fn().mockResolvedValue({ success: true, data: [] }),
  getTournamentDetail: vi.fn().mockResolvedValue({ success: true, data: null }),
  joinTournament: vi.fn().mockResolvedValue({ success: true }),
  leaveTournament: vi.fn().mockResolvedValue({ success: true })
}));

import { TournamentList } from '../tournament-list';
import { useTournamentStore } from '@/stores/tournament-store';

const makeTournament = (overrides: Partial<Tournament> = {}): Tournament => ({
  id: '123e4567-e89b-12d3-a456-426614174000',
  title: 'Test Tournament',
  time_control: '3+2',
  start_time: new Date(Date.now() + 3600000).toISOString(),
  duration_minutes: 60,
  status: 'upcoming',
  participant_count: 5,
  standings: [],
  current_round: 0,
  created_at: '2026-04-01T00:00:00Z',
  updated_at: '2026-04-01T00:00:00Z',
  ...overrides
});

describe('TournamentList', () => {
  beforeEach(() => {
    useTournamentStore.getState().reset();
  });

  it('renders empty state when no tournaments', async () => {
    render(<TournamentList initialTournaments={[]} />);
    await waitFor(() => {
      expect(screen.getByText('Không có giải đấu sắp tới')).toBeInTheDocument();
      expect(screen.getByText('Quay lại sau')).toBeInTheDocument();
    });
  });

  it('groups tournaments by status', async () => {
    const tournaments = [
      makeTournament({ id: '1', title: 'Active 1', status: 'active' }),
      makeTournament({ id: '2', title: 'Upcoming 1', status: 'upcoming' }),
      makeTournament({ id: '3', title: 'Completed 1', status: 'completed' })
    ];

    render(<TournamentList initialTournaments={tournaments} />);

    await waitFor(() => {
      // Section headings + card status labels both exist
      expect(screen.getAllByText('Đang diễn ra').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Sắp diễn ra').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Đã kết thúc').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByTestId('tournament-card')).toHaveLength(3);
    });
  });

  it('renders tournament cards', async () => {
    const tournaments = [makeTournament({ title: 'My Tournament' })];

    render(<TournamentList initialTournaments={tournaments} />);

    await waitFor(() => {
      expect(screen.getByText('My Tournament')).toBeInTheDocument();
      expect(screen.getAllByTestId('tournament-card')).toHaveLength(1);
    });
  });

  it('clears stale error after seeding initial tournaments', async () => {
    useTournamentStore.setState({ error: 'Không thể tải giải đấu' });

    render(<TournamentList initialTournaments={[]} />);

    await waitFor(() => {
      expect(screen.getByText('Không có giải đấu sắp tới')).toBeInTheDocument();
      expect(useTournamentStore.getState().error).toBeNull();
    });
  });

  it('sorts upcoming by start_time ascending', async () => {
    const earlier = makeTournament({
      id: '1',
      title: 'Earlier',
      status: 'upcoming',
      start_time: new Date(Date.now() + 3600000).toISOString()
    });
    const later = makeTournament({
      id: '2',
      title: 'Later',
      status: 'upcoming',
      start_time: new Date(Date.now() + 7200000).toISOString()
    });

    // Pass in reverse order to verify sorting
    render(<TournamentList initialTournaments={[later, earlier]} />);

    await waitFor(() => {
      const cards = screen.getAllByTestId('tournament-card');
      expect(cards).toHaveLength(2);
      expect(cards[0]).toHaveTextContent('Earlier');
      expect(cards[1]).toHaveTextContent('Later');
    });
  });

  it('sorts completed by updated_at descending', async () => {
    const older = makeTournament({
      id: '1',
      title: 'Older Completed',
      status: 'completed',
      updated_at: '2026-04-01T00:00:00Z'
    });
    const newer = makeTournament({
      id: '2',
      title: 'Newer Completed',
      status: 'completed',
      updated_at: '2026-04-02T00:00:00Z'
    });

    render(<TournamentList initialTournaments={[older, newer]} />);

    await waitFor(() => {
      const cards = screen.getAllByTestId('tournament-card');
      expect(cards).toHaveLength(2);
      expect(cards[0]).toHaveTextContent('Newer Completed');
      expect(cards[1]).toHaveTextContent('Older Completed');
    });
  });
});
