'use client';

import { useEffect, useState } from 'react';
import { Trophy } from 'lucide-react';

import type { Tournament } from '@/lib/types/tournament';
import { useTournamentStore } from '@/stores/tournament-store';
import { useTournamentChannel } from '@/hooks/use-tournament-channel';
import { createClient } from '@/lib/supabase/browser';
import { TournamentCard } from './tournament-card';

function groupTournaments(tournaments: Tournament[]) {
  const active: Tournament[] = [];
  const upcoming: Tournament[] = [];
  const completed: Tournament[] = [];

  for (const t of tournaments) {
    if (t.status === 'active') active.push(t);
    else if (t.status === 'upcoming') upcoming.push(t);
    else completed.push(t);
  }

  // Sort upcoming by start_time ascending
  upcoming.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
  // Sort completed by update time descending (most recently completed/updated first)
  completed.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

  return { active, upcoming, completed };
}

type TournamentListProps = {
  initialTournaments: Tournament[];
};

export function TournamentList({ initialTournaments }: TournamentListProps) {
  const { tournaments, error, joinTournament, leaveTournament, setTournaments } =
    useTournamentStore();
  const [joinedIds, setJoinedIds] = useState<Set<string>>(new Set());

  // Subscribe to realtime updates
  useTournamentChannel();

  // Seed store with server-fetched data on mount
  useEffect(() => {
    setTournaments(initialTournaments);
  }, [initialTournaments, setTournaments]);

  // Load user's joined tournaments
  useEffect(() => {
    async function loadJoined() {
      const supabase = createClient();
      const {
        data: { user }
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('tournament_participants')
        .select('tournament_id')
        .eq('user_id', user.id);

      if (data) {
        setJoinedIds(new Set(data.map((p) => p.tournament_id)));
      }
    }
    loadJoined();
  }, []);

  async function handleJoin(tournamentId: string) {
    const result = await joinTournament(tournamentId);
    if (result.success) {
      setJoinedIds((prev) => new Set(prev).add(tournamentId));
    }
    return result;
  }

  async function handleLeave(tournamentId: string) {
    const result = await leaveTournament(tournamentId);
    if (result.success) {
      setJoinedIds((prev) => {
        const next = new Set(prev);
        next.delete(tournamentId);
        return next;
      });
    }
    return result;
  }

  if (error && tournaments.length === 0) {
    return (
      <div className="border border-[var(--color-border)] p-[var(--space-6)] text-center">
        <p className="text-[var(--text-sm)] text-[var(--color-text-muted)]">
          Không thể tải giải đấu
        </p>
      </div>
    );
  }

  const { active, upcoming, completed } = groupTournaments(tournaments);
  const isEmpty = active.length === 0 && upcoming.length === 0 && completed.length === 0;

  if (isEmpty) {
    return (
      <div className="border border-[var(--color-border)] p-[var(--space-6)] text-center">
        <Trophy size={32} className="mx-auto mb-[var(--space-3)] text-[var(--color-text-muted)]" />
        <p className="text-[var(--text-sm)] text-[var(--color-text-muted)]">
          Không có giải đấu sắp tới
        </p>
        <p className="mt-[var(--space-1)] text-[var(--text-xs)] text-[var(--color-text-muted)]">
          Quay lại sau
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-[var(--space-6)]">
      {active.length > 0 && (
        <section>
          <h2 className="mb-[var(--space-3)] text-[var(--text-base)] font-semibold text-[var(--color-text)]">
            Đang diễn ra
          </h2>
          <div className="space-y-[var(--space-3)]">
            {active.map((t) => (
              <TournamentCard
                key={t.id}
                tournament={t}
                isJoined={joinedIds.has(t.id)}
                onJoin={handleJoin}
                onLeave={handleLeave}
              />
            ))}
          </div>
        </section>
      )}

      {upcoming.length > 0 && (
        <section>
          <h2 className="mb-[var(--space-3)] text-[var(--text-base)] font-semibold text-[var(--color-text)]">
            Sắp diễn ra
          </h2>
          <div className="space-y-[var(--space-3)]">
            {upcoming.map((t) => (
              <TournamentCard
                key={t.id}
                tournament={t}
                isJoined={joinedIds.has(t.id)}
                onJoin={handleJoin}
                onLeave={handleLeave}
              />
            ))}
          </div>
        </section>
      )}

      {completed.length > 0 && (
        <section>
          <h2 className="mb-[var(--space-3)] text-[var(--text-base)] font-semibold text-[var(--color-text)]">
            Đã kết thúc
          </h2>
          <div className="space-y-[var(--space-3)]">
            {completed.map((t) => (
              <TournamentCard
                key={t.id}
                tournament={t}
                isJoined={joinedIds.has(t.id)}
                onJoin={handleJoin}
                onLeave={handleLeave}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
