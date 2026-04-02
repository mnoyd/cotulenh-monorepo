'use client';

import { useEffect } from 'react';

import { createClient } from '@/lib/supabase/browser';
import type { Tournament } from '@/lib/types/tournament';
import { useTournamentStore } from '@/stores/tournament-store';

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
