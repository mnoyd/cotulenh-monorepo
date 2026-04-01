import Link from 'next/link';
import { Medal } from 'lucide-react';

import { EmptyState } from '@/components/layout/empty-state';
import { getActivityLeaderboard } from '@/lib/leaderboard';

const PREVIEW_LIMIT = 5;

function formatRating(rating: number, ratingGamesPlayed: number): string {
  return `${rating}${ratingGamesPlayed < 30 ? '?' : ''}`;
}

export async function LeaderboardSection() {
  const { entries, currentUserId, currentUserEntry } = await getActivityLeaderboard();
  const previewEntries = entries.slice(0, PREVIEW_LIMIT);

  if (previewEntries.length === 0) {
    return (
      <section className="border border-[var(--color-border)] p-[var(--space-4)]">
        <h2 className="mb-[var(--space-3)] text-[var(--text-base)] font-semibold text-[var(--color-text)]">
          Bảng xếp hạng
        </h2>
        <EmptyState
          icon={Medal}
          message="Chưa có trận hoàn thành nào trong tháng này"
          actionLabel="Tìm đối thủ"
          actionHref="/play"
        />
      </section>
    );
  }

  return (
    <section className="border border-[var(--color-border)] p-[var(--space-4)]">
      <div className="mb-[var(--space-3)] flex items-center justify-between gap-[var(--space-3)]">
        <h2 className="text-[var(--text-base)] font-semibold text-[var(--color-text)]">
          Bảng xếp hạng
        </h2>
        <Link
          href="/leaderboard"
          className="text-[var(--text-xs)] font-medium text-[var(--color-primary)] hover:underline"
        >
          Xem tất cả
        </Link>
      </div>

      <ol className="space-y-[var(--space-2)]">
        {previewEntries.map((entry) => {
          const isCurrentUser = entry.userId === currentUserId;
          return (
            <li
              key={entry.userId}
              className={`flex items-center justify-between gap-[var(--space-3)] border border-[var(--color-border)] px-[var(--space-3)] py-[var(--space-2)] ${
                isCurrentUser ? 'bg-[var(--color-surface-elevated)]' : ''
              }`}
              data-testid={`leaderboard-preview-row-${entry.rank}`}
            >
              <div className="min-w-0">
                <p className="text-[var(--text-sm)] font-semibold text-[var(--color-text)]">
                  #{entry.rank} {entry.displayName}
                </p>
                <p className="text-[var(--text-xs)] text-[var(--color-text-muted)]">
                  {entry.gamesPlayed} trận tháng này
                </p>
              </div>
              <p className="font-mono text-[var(--text-xs)] text-[var(--color-text-muted)]">
                {formatRating(entry.rating, entry.ratingGamesPlayed)}
              </p>
            </li>
          );
        })}
      </ol>

      {currentUserEntry &&
      !previewEntries.some((entry) => entry.userId === currentUserEntry.userId) ? (
        <div
          className="mt-[var(--space-3)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-[var(--space-3)] py-[var(--space-2)]"
          data-testid="leaderboard-preview-current-user"
        >
          <p className="text-[var(--text-xs)] text-[var(--color-text-muted)]">Vị trí của bạn</p>
          <p className="text-[var(--text-sm)] font-semibold text-[var(--color-text)]">
            #{currentUserEntry.rank} {currentUserEntry.displayName}
          </p>
        </div>
      ) : null}
    </section>
  );
}
