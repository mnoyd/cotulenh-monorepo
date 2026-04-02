import { TournamentSkeleton } from '@/components/tournament/tournament-skeleton';

export default function TournamentLoading() {
  return (
    <div className="mx-auto max-w-2xl p-[var(--space-4)]">
      <div className="animate-pulse">
        <div className="mb-[var(--space-4)] h-7 w-32 bg-[var(--color-surface-elevated)]" />
      </div>
      <TournamentSkeleton />
    </div>
  );
}
