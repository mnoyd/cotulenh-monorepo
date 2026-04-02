import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { getTournamentsMock, joinTournamentMock, leaveTournamentMock } = vi.hoisted(() => {
  return {
    getTournamentsMock: vi.fn(),
    joinTournamentMock: vi.fn(),
    leaveTournamentMock: vi.fn()
  };
});

vi.mock('@/lib/actions/tournament', () => ({
  getTournaments: getTournamentsMock,
  joinTournament: joinTournamentMock,
  leaveTournament: leaveTournamentMock
}));

import { useTournamentStore } from '../tournament-store';
import type { Tournament } from '@/lib/types/tournament';

const mockTournament: Tournament = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  title: 'Giải đấu test',
  time_control: '3+2',
  start_time: '2026-04-05T10:00:00Z',
  duration_minutes: 60,
  status: 'upcoming',
  participant_count: 5,
  standings: [],
  created_at: '2026-04-01T00:00:00Z',
  updated_at: '2026-04-01T00:00:00Z'
};

const mockTournamentActive: Tournament = {
  ...mockTournament,
  id: '223e4567-e89b-12d3-a456-426614174000',
  title: 'Giải đang diễn ra',
  status: 'active'
};

describe('useTournamentStore', () => {
  beforeEach(() => {
    useTournamentStore.getState().reset();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('fetchTournaments', () => {
    it('loads tournaments on success', async () => {
      getTournamentsMock.mockResolvedValue({
        success: true,
        data: [mockTournament, mockTournamentActive]
      });

      await useTournamentStore.getState().fetchTournaments();

      const state = useTournamentStore.getState();
      expect(state.tournaments).toHaveLength(2);
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('sets loading true during fetch', async () => {
      let resolvePromise: (value: unknown) => void;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      getTournamentsMock.mockReturnValue(promise);

      const fetchPromise = useTournamentStore.getState().fetchTournaments();
      expect(useTournamentStore.getState().loading).toBe(true);

      resolvePromise!({ success: true, data: [] });
      await fetchPromise;
      expect(useTournamentStore.getState().loading).toBe(false);
    });

    it('sets error on failure', async () => {
      getTournamentsMock.mockResolvedValue({
        success: false,
        error: 'Không thể tải giải đấu'
      });

      await useTournamentStore.getState().fetchTournaments();

      const state = useTournamentStore.getState();
      expect(state.error).toBe('Không thể tải giải đấu');
      expect(state.tournaments).toHaveLength(0);
      expect(state.loading).toBe(false);
    });
  });

  describe('joinTournament', () => {
    it('refreshes tournaments on success', async () => {
      useTournamentStore.getState().setTournaments([mockTournament]);
      joinTournamentMock.mockResolvedValue({ success: true });
      getTournamentsMock.mockResolvedValue({
        success: true,
        data: [{ ...mockTournament, participant_count: 6 }]
      });

      const result = await useTournamentStore.getState().joinTournament(mockTournament.id);

      expect(result.success).toBe(true);
      const updated = useTournamentStore.getState().tournaments[0];
      expect(updated.participant_count).toBe(6);
      expect(getTournamentsMock).toHaveBeenCalled();
    });

    it('returns error without updating state on failure', async () => {
      useTournamentStore.getState().setTournaments([mockTournament]);
      joinTournamentMock.mockResolvedValue({
        success: false,
        error: 'Không thể tham gia giải đấu'
      });

      const result = await useTournamentStore.getState().joinTournament(mockTournament.id);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Không thể tham gia giải đấu');
      const updated = useTournamentStore.getState().tournaments[0];
      expect(updated.participant_count).toBe(5);
    });
  });

  describe('leaveTournament', () => {
    it('refreshes tournaments on success', async () => {
      useTournamentStore.getState().setTournaments([mockTournament]);
      leaveTournamentMock.mockResolvedValue({ success: true });
      getTournamentsMock.mockResolvedValue({
        success: true,
        data: [{ ...mockTournament, participant_count: 4 }]
      });

      const result = await useTournamentStore.getState().leaveTournament(mockTournament.id);

      expect(result.success).toBe(true);
      const updated = useTournamentStore.getState().tournaments[0];
      expect(updated.participant_count).toBe(4);
      expect(getTournamentsMock).toHaveBeenCalled();
    });

    it('returns error without updating state on failure', async () => {
      useTournamentStore.getState().setTournaments([mockTournament]);
      leaveTournamentMock.mockResolvedValue({
        success: false,
        error: 'Không thể rời giải đấu'
      });

      const result = await useTournamentStore.getState().leaveTournament(mockTournament.id);

      expect(result.success).toBe(false);
      const updated = useTournamentStore.getState().tournaments[0];
      expect(updated.participant_count).toBe(5);
    });
  });

  describe('updateTournament', () => {
    it('replaces tournament with matching id', () => {
      useTournamentStore.getState().setTournaments([mockTournament]);

      const updated = { ...mockTournament, participant_count: 10 };
      useTournamentStore.getState().updateTournament(updated);

      expect(useTournamentStore.getState().tournaments[0].participant_count).toBe(10);
    });
  });

  describe('reset', () => {
    it('clears all state', async () => {
      getTournamentsMock.mockResolvedValue({ success: true, data: [mockTournament] });
      await useTournamentStore.getState().fetchTournaments();
      expect(useTournamentStore.getState().tournaments).toHaveLength(1);

      useTournamentStore.getState().reset();

      const state = useTournamentStore.getState();
      expect(state.tournaments).toHaveLength(0);
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });
  });
});
