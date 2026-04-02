'use client';

import { useState } from 'react';
import { Clock, Users } from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { Tournament } from '@/lib/types/tournament';

function formatStartTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 0) {
    return new Intl.DateTimeFormat('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit'
    }).format(date);
  }

  if (diffMinutes < 60) {
    return `${diffMinutes} phút nữa`;
  }

  if (diffMinutes < 1440) {
    const hours = Math.floor(diffMinutes / 60);
    return `${hours} giờ nữa`;
  }

  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit'
  }).format(date);
}

const statusLabels: Record<Tournament['status'], string> = {
  upcoming: 'Sắp diễn ra',
  active: 'Đang diễn ra',
  completed: 'Đã kết thúc'
};

const statusColors: Record<Tournament['status'], string> = {
  upcoming: 'text-[var(--color-primary)]',
  active: 'text-[var(--color-success)]',
  completed: 'text-[var(--color-text-muted)]'
};

type TournamentCardProps = {
  tournament: Tournament;
  isJoined: boolean;
  onJoin: (tournamentId: string) => Promise<{ success: boolean; error?: string }>;
  onLeave: (tournamentId: string) => Promise<{ success: boolean; error?: string }>;
};

export function TournamentCard({ tournament, isJoined, onJoin, onLeave }: TournamentCardProps) {
  const [actionLoading, setActionLoading] = useState(false);

  const canJoinOrLeave = tournament.status === 'upcoming';

  async function handleAction() {
    setActionLoading(true);
    if (isJoined) {
      await onLeave(tournament.id);
    } else {
      await onJoin(tournament.id);
    }
    setActionLoading(false);
  }

  return (
    <div
      className="border border-[var(--color-border)] p-[var(--space-4)]"
      data-testid="tournament-card"
    >
      <div className="flex items-start justify-between gap-[var(--space-3)]">
        <div className="min-w-0">
          <h3 className="text-[var(--text-base)] font-semibold text-[var(--color-text)]">
            {tournament.title}
          </h3>
          <p className={`text-[var(--text-xs)] font-medium ${statusColors[tournament.status]}`}>
            {statusLabels[tournament.status]}
          </p>
        </div>
      </div>

      <div className="mt-[var(--space-3)] flex flex-wrap items-center gap-[var(--space-4)] text-[var(--text-xs)] text-[var(--color-text-muted)]">
        <span className="flex items-center gap-[var(--space-1)]">
          <Clock size={14} />
          {tournament.time_control}
        </span>
        <span className="flex items-center gap-[var(--space-1)]">
          <Users size={14} />
          {tournament.participant_count} người chơi
        </span>
        <span>{tournament.duration_minutes} phút</span>
        <span>{formatStartTime(tournament.start_time)}</span>
      </div>

      {canJoinOrLeave && (
        <div className="mt-[var(--space-3)]">
          <Button
            variant={isJoined ? 'outline' : 'default'}
            size="sm"
            disabled={actionLoading}
            onClick={handleAction}
            data-testid={isJoined ? 'leave-button' : 'join-button'}
          >
            {actionLoading ? '...' : isJoined ? 'Rời giải' : 'Tham gia'}
          </Button>
        </div>
      )}
    </div>
  );
}
