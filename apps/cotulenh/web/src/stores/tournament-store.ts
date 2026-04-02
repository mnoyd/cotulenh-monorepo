import { create } from 'zustand';

import type { Tournament, TournamentStanding } from '@/lib/types/tournament';
import {
  getTournaments as fetchTournamentsAction,
  getTournamentDetail as fetchTournamentDetailAction,
  joinTournament as joinTournamentAction,
  leaveTournament as leaveTournamentAction
} from '@/lib/actions/tournament';

type TournamentStore = {
  tournaments: Tournament[];
  loading: boolean;
  error: string | null;

  // Detail view state
  activeTournament: Tournament | null;
  standings: TournamentStanding[];
  detailLoading: boolean;
  detailError: string | null;

  fetchTournaments: () => Promise<void>;
  joinTournament: (tournamentId: string) => Promise<{ success: boolean; error?: string }>;
  leaveTournament: (tournamentId: string) => Promise<{ success: boolean; error?: string }>;
  updateTournament: (updated: Tournament) => void;
  setTournaments: (tournaments: Tournament[]) => void;
  setActiveTournament: (tournament: Tournament | null) => void;
  fetchTournamentDetail: (tournamentId: string) => Promise<void>;
  updateStandings: (standings: TournamentStanding[]) => void;
  reset: () => void;
};

export const useTournamentStore = create<TournamentStore>((set, get) => ({
  tournaments: [],
  loading: false,
  error: null,
  activeTournament: null,
  standings: [],
  detailLoading: false,
  detailError: null,

  fetchTournaments: async () => {
    set({ loading: true, error: null });
    const result = await fetchTournamentsAction();
    if (result.success) {
      set({ tournaments: result.data, loading: false, error: null });
    } else {
      set({ error: result.error, loading: false });
    }
  },

  joinTournament: async (tournamentId: string) => {
    const result = await joinTournamentAction(tournamentId);
    if (!result.success) {
      return { success: false, error: result.error };
    }

    const latest = await fetchTournamentsAction();
    if (latest.success) {
      set({ tournaments: latest.data, error: null });
    } else {
      set({ error: latest.error });
    }

    return { success: true };
  },

  leaveTournament: async (tournamentId: string) => {
    const result = await leaveTournamentAction(tournamentId);
    if (!result.success) {
      return { success: false, error: result.error };
    }

    const latest = await fetchTournamentsAction();
    if (latest.success) {
      set({ tournaments: latest.data, error: null });
    } else {
      set({ error: latest.error });
    }

    return { success: true };
  },

  updateTournament: (updated: Tournament) => {
    const tournaments = get().tournaments.map((t) => (t.id === updated.id ? updated : t));
    set({ tournaments });

    // Also update activeTournament if it matches
    if (get().activeTournament?.id === updated.id) {
      set({
        activeTournament: updated,
        standings: updated.standings ?? []
      });
    }
  },

  setTournaments: (tournaments: Tournament[]) => {
    set({ tournaments, error: null, loading: false });
  },

  setActiveTournament: (tournament: Tournament | null) => {
    set({
      activeTournament: tournament,
      standings: tournament?.standings ?? []
    });
  },

  fetchTournamentDetail: async (tournamentId: string) => {
    set({ detailLoading: true, detailError: null });
    const result = await fetchTournamentDetailAction(tournamentId);
    if (result.success) {
      set({
        activeTournament: result.data,
        standings: result.data.standings ?? [],
        detailLoading: false,
        detailError: null
      });
    } else {
      set({ detailError: result.error, detailLoading: false });
    }
  },

  updateStandings: (standings: TournamentStanding[]) => {
    set({ standings });
  },

  reset: () => {
    set({
      tournaments: [],
      loading: false,
      error: null,
      activeTournament: null,
      standings: [],
      detailLoading: false,
      detailError: null
    });
  }
}));
