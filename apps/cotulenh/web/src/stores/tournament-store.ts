import { create } from 'zustand';

import type { Tournament } from '@/lib/types/tournament';
import {
  getTournaments as fetchTournamentsAction,
  joinTournament as joinTournamentAction,
  leaveTournament as leaveTournamentAction
} from '@/lib/actions/tournament';

type TournamentStore = {
  tournaments: Tournament[];
  loading: boolean;
  error: string | null;

  fetchTournaments: () => Promise<void>;
  joinTournament: (tournamentId: string) => Promise<{ success: boolean; error?: string }>;
  leaveTournament: (tournamentId: string) => Promise<{ success: boolean; error?: string }>;
  updateTournament: (updated: Tournament) => void;
  setTournaments: (tournaments: Tournament[]) => void;
  reset: () => void;
};

export const useTournamentStore = create<TournamentStore>((set, get) => ({
  tournaments: [],
  loading: false,
  error: null,

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
  },

  setTournaments: (tournaments: Tournament[]) => {
    set({ tournaments, error: null, loading: false });
  },

  reset: () => {
    set({ tournaments: [], loading: false, error: null });
  }
}));
