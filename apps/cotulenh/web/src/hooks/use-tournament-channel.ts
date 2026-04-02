'use client';

import { useEffect } from 'react';

import { createClient } from '@/lib/supabase/browser';
import type { Tournament, TournamentStanding } from '@/lib/types/tournament';
import { useTournamentStore } from '@/stores/tournament-store';

/** Subscribe to Postgres Changes on the tournaments table (lobby view) */
export function useTournamentChannel() {
  const updateTournament = useTournamentStore((s) => s.updateTournament);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel('tournaments-lobby')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tournaments'
        },
        (payload) => {
          const updated = payload.new as Tournament;
          updateTournament(updated);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [updateTournament]);
}

/** Subscribe to a specific tournament's updates (detail/standings view) */
export function useTournamentDetailChannel(tournamentId: string) {
  const updateTournament = useTournamentStore((s) => s.updateTournament);
  const updateStandings = useTournamentStore((s) => s.updateStandings);

  useEffect(() => {
    if (!tournamentId) return;

    const supabase = createClient();

    // Postgres Changes for standings updates
    const channel = supabase
      .channel(`tournament-detail:${tournamentId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tournaments',
          filter: `id=eq.${tournamentId}`
        },
        (payload) => {
          const updated = payload.new as Tournament;
          updateTournament(updated);
          if (updated.standings) {
            updateStandings(updated.standings as TournamentStanding[]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tournamentId, updateTournament, updateStandings]);
}
