'use client';

import { useEffect, useState } from 'react';
import { Clock, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { TournamentStandings } from '@/components/tournament/tournament-standings';
import { useTournamentDetailChannel } from '@/hooks/use-tournament-channel';
import { createClient } from '@/lib/supabase/browser';
import type { Tournament } from '@/lib/types/tournament';
import { useTournamentStore } from '@/stores/tournament-store';

const statusLabels: Record<Tournament['status'], string> = {
  upcoming: 'Sap dien ra',
  active: 'Dang dien ra',
  completed: 'Da ket thuc'
};

const statusColors: Record<Tournament['status'], string> = {
  upcoming: 'text-[var(--color-primary)]',
  active: 'text-[var(--color-success)]',
  completed: 'text-[var(--color-text-muted)]'
};

type TournamentDetailClientProps = {
  tournament: Tournament;
  currentUserId?: string;
};

export function TournamentDetailClient({
  tournament: initialTournament,
  currentUserId
}: TournamentDetailClientProps) {
  const router = useRouter();
  const activeTournament = useTournamentStore((s) => s.activeTournament);
  const standings = useTournamentStore((s) => s.standings);
  const setActiveTournament = useTournamentStore((s) => s.setActiveTournament);
  const [isPairingInProgress, setIsPairingInProgress] = useState(
    initialTournament.status === 'active'
  );

  // Seed store with server data on mount
  useEffect(() => {
    setActiveTournament(initialTournament);
  }, [initialTournament, setActiveTournament]);

  // Subscribe to real-time updates for this tournament
  useTournamentDetailChannel(initialTournament.id);

  // Subscribe to pairing broadcasts and auto-navigate to newly paired game.
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`tournament:${initialTournament.id}`)
      .on('broadcast', { event: 'round_start' }, ({ payload }: { payload: unknown }) => {
        const raw = payload as {
          payload?: {
            pairings?: Array<{
              game_id: string;
              red_player: string;
              blue_player: string;
            }>;
            bye_player?: string | null;
          };
        };

        const pairings = raw.payload?.pairings ?? [];
        if (!currentUserId || pairings.length === 0) return;

        const myPair = pairings.find(
          (p) => p.red_player === currentUserId || p.blue_player === currentUserId
        );

        if (myPair?.game_id) {
          setIsPairingInProgress(false);
          router.push(`/game/${myPair.game_id}`);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, initialTournament.id, router]);

  const tournament = activeTournament ?? initialTournament;
  const currentStandings = standings.length > 0 ? standings : (tournament.standings ?? []);

  useEffect(() => {
    let cancelled = false;

    if (!currentUserId || tournament.status !== 'active') {
      setIsPairingInProgress(false);
      return () => {
        cancelled = true;
      };
    }

    const supabase = createClient();
    const checkPairingState = async () => {
      const { data, error } = await supabase
        .from('games')
        .select('id')
        .eq('tournament_id', tournament.id)
        .eq('status', 'started')
        .or(`red_player.eq.${currentUserId},blue_player.eq.${currentUserId}`)
        .limit(1);

      if (cancelled) return;
      if (error) {
        // Fail open to avoid hiding the waiting banner when unsure.
        setIsPairingInProgress(true);
        return;
      }

      const existingGameId =
        Array.isArray(data) && data.length > 0 ? ((data[0] as { id?: string }).id ?? null) : null;

      if (existingGameId) {
        setIsPairingInProgress(false);
        router.push(`/game/${existingGameId}`);
        return;
      }

      setIsPairingInProgress(true);
    };

    void checkPairingState();

    return () => {
      cancelled = true;
    };
  }, [currentUserId, router, tournament.id, tournament.status, tournament.current_round]);

  return (
    <div className="p-[var(--space-6)] max-w-2xl mx-auto">
      <div className="mb-[var(--space-6)]">
        <div className="flex items-start justify-between gap-[var(--space-3)]">
          <h1 className="text-[var(--text-xl)] font-bold text-[var(--color-text)]">
            {tournament.title}
          </h1>
          <span className={`text-[var(--text-sm)] font-medium ${statusColors[tournament.status]}`}>
            {statusLabels[tournament.status]}
          </span>
        </div>

        <div className="mt-[var(--space-3)] flex flex-wrap items-center gap-[var(--space-4)] text-[var(--text-sm)] text-[var(--color-text-muted)]">
          <span className="flex items-center gap-[var(--space-1)]">
            <Clock size={16} />
            {tournament.time_control}
          </span>
          <span className="flex items-center gap-[var(--space-1)]">
            <Users size={16} />
            {tournament.participant_count} nguoi choi
          </span>
          <span>{tournament.duration_minutes} phut</span>
          {tournament.current_round > 0 && <span>Vong {tournament.current_round}</span>}
        </div>
      </div>

      <div>
        <h2 className="text-[var(--text-lg)] font-semibold text-[var(--color-text)] mb-[var(--space-3)]">
          Bang xep hang
        </h2>
        <TournamentStandings
          standings={currentStandings}
          currentUserId={currentUserId}
          isActive={isPairingInProgress}
        />
      </div>
    </div>
  );
}
