import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Tournament } from '@/lib/types/tournament';
import { useTournamentStore } from '@/stores/tournament-store';

import { TournamentDetailClient } from '../tournament-detail-client';

const { pushMock, limitMock, createClientMock, useTournamentDetailChannelMock } = vi.hoisted(() => {
  return {
    pushMock: vi.fn(),
    limitMock: vi.fn(),
    createClientMock: vi.fn(),
    useTournamentDetailChannelMock: vi.fn()
  };
});

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock
  })
}));

vi.mock('@/hooks/use-tournament-channel', () => ({
  useTournamentDetailChannel: useTournamentDetailChannelMock
}));

vi.mock('@/lib/supabase/browser', () => ({
  createClient: createClientMock
}));

const baseTournament: Tournament = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  title: 'Giai dau test',
  time_control: '3+2',
  start_time: '2026-04-05T10:00:00Z',
  duration_minutes: 60,
  status: 'active',
  participant_count: 6,
  standings: [],
  current_round: 2,
  created_at: '2026-04-01T00:00:00Z',
  updated_at: '2026-04-01T00:00:00Z'
};

describe('TournamentDetailClient', () => {
  beforeEach(() => {
    useTournamentStore.getState().reset();
    vi.clearAllMocks();

    createClientMock.mockReturnValue({
      channel: vi.fn(() => ({
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn().mockReturnThis()
      })),
      removeChannel: vi.fn(),
      from: vi.fn((table: string) => {
        if (table !== 'games') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  or: vi.fn(() => ({
                    limit: limitMock
                  }))
                }))
              }))
            }))
          };
        }

        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                or: vi.fn(() => ({
                  limit: limitMock
                }))
              }))
            }))
          }))
        };
      })
    });
  });

  it('redirects participant to an existing active game on page load', async () => {
    limitMock.mockResolvedValue({
      data: [{ id: 'game-123' }],
      error: null
    });

    render(<TournamentDetailClient tournament={baseTournament} currentUserId="user-1" />);

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith('/game/game-123');
    });
  });

  it('shows between-rounds banner when participant has no active game', async () => {
    limitMock.mockResolvedValue({
      data: [],
      error: null
    });

    render(<TournamentDetailClient tournament={baseTournament} currentUserId="user-1" />);

    await waitFor(() => {
      expect(screen.getByText('Dang tim doi thu...')).toBeInTheDocument();
    });
    expect(pushMock).not.toHaveBeenCalled();
  });
});
