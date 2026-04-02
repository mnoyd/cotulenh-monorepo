'use client';

import type { TournamentStanding } from '@/lib/types/tournament';

type TournamentStandingsProps = {
  standings: TournamentStanding[];
  currentUserId?: string;
  isActive: boolean;
};

export function TournamentStandings({
  standings,
  currentUserId,
  isActive
}: TournamentStandingsProps) {
  if (standings.length === 0) {
    return (
      <p className="text-[var(--text-sm)] text-[var(--color-text-muted)] py-[var(--space-4)]">
        Chua co ket qua
      </p>
    );
  }

  return (
    <div data-testid="tournament-standings">
      {isActive && (
        <div
          className="mb-[var(--space-3)] text-[var(--text-sm)] text-[var(--color-primary)] animate-pulse"
          data-testid="between-rounds-banner"
        >
          Dang tim doi thu...
        </div>
      )}
      <table className="w-full text-[var(--text-sm)]">
        <thead>
          <tr className="border-b border-[var(--color-border)] text-[var(--color-text-muted)] text-left">
            <th className="py-[var(--space-2)] pr-[var(--space-3)]">Hang</th>
            <th className="py-[var(--space-2)] pr-[var(--space-3)]">Nguoi choi</th>
            <th className="py-[var(--space-2)] pr-[var(--space-3)] text-right">Diem</th>
            <th className="py-[var(--space-2)] text-right">Van</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((standing, index) => {
            const isCurrentUser = standing.player_id === currentUserId;
            return (
              <tr
                key={standing.player_id}
                className={`border-b border-[var(--color-border)] ${isCurrentUser ? 'bg-[var(--color-primary)]/10 font-semibold' : ''}`}
                data-testid={isCurrentUser ? 'current-user-row' : undefined}
              >
                <td className="py-[var(--space-2)] pr-[var(--space-3)]">{index + 1}</td>
                <td className="py-[var(--space-2)] pr-[var(--space-3)]">{standing.player_name}</td>
                <td className="py-[var(--space-2)] pr-[var(--space-3)] text-right">
                  {standing.score}
                </td>
                <td className="py-[var(--space-2)] text-right">{standing.games_played}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
