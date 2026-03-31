import Link from 'next/link';

import type { ActivityLeaderboardEntry } from '@/lib/leaderboard';

type ActivityLeaderboardTableProps = {
  entries: ActivityLeaderboardEntry[];
  currentUserId: string;
  pinnedCurrentUser?: ActivityLeaderboardEntry | null;
  page: number;
  totalPages: number;
};

function formatRating(rating: number, ratingGamesPlayed: number): string {
  return `${rating}${ratingGamesPlayed < 30 ? '?' : ''}`;
}

function formatLastActive(lastActiveAt: string): string {
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(new Date(lastActiveAt));
}

function rowClass(isCurrentUser: boolean): string {
  return isCurrentUser
    ? 'bg-[var(--color-surface-elevated)] text-[var(--color-text)]'
    : 'text-[var(--color-text)]';
}

export function ActivityLeaderboardTable({
  entries,
  currentUserId,
  pinnedCurrentUser,
  page,
  totalPages
}: ActivityLeaderboardTableProps) {
  return (
    <div className="space-y-[var(--space-4)]">
      <div className="space-y-[var(--space-3)] md:hidden">
        {entries.map((entry) => {
          const isCurrentUser = entry.userId === currentUserId;
          return (
            <article
              key={entry.userId}
              className={`border border-[var(--color-border)] p-[var(--space-3)] ${rowClass(isCurrentUser)}`}
              data-testid={`leaderboard-card-${entry.rank}`}
            >
              <div className="flex items-start justify-between gap-[var(--space-3)]">
                <div>
                  <p className="text-[var(--text-xs)] text-[var(--color-text-muted)]">
                    Hạng {entry.rank}
                  </p>
                  <h2 className="text-[var(--text-base)] font-semibold">{entry.displayName}</h2>
                </div>
                <p className="font-mono text-[var(--text-sm)] text-[var(--color-text-muted)]">
                  {formatRating(entry.rating, entry.ratingGamesPlayed)}
                </p>
              </div>
              <div className="mt-[var(--space-3)] grid grid-cols-2 gap-[var(--space-3)] text-[var(--text-sm)]">
                <div>
                  <p className="text-[var(--color-text-muted)]">Số trận tháng này</p>
                  <p className="font-semibold">{entry.gamesPlayed}</p>
                </div>
                <div>
                  <p className="text-[var(--color-text-muted)]">Hoạt động gần nhất</p>
                  <p className="font-semibold">{formatLastActive(entry.lastActiveAt)}</p>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="min-w-full border-collapse text-left text-[var(--text-sm)]">
          <thead>
            <tr className="border-b border-[var(--color-border)] text-[var(--color-text-muted)]">
              <th className="px-[var(--space-3)] py-[var(--space-2)] font-medium">Hạng</th>
              <th className="px-[var(--space-3)] py-[var(--space-2)] font-medium">Người chơi</th>
              <th className="px-[var(--space-3)] py-[var(--space-2)] font-medium">
                Số trận tháng này
              </th>
              <th className="px-[var(--space-3)] py-[var(--space-2)] font-medium">Điểm hiện tại</th>
              <th className="px-[var(--space-3)] py-[var(--space-2)] font-medium">
                Hoạt động gần nhất
              </th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => {
              const isCurrentUser = entry.userId === currentUserId;
              return (
                <tr
                  key={entry.userId}
                  className={`border-b border-[var(--color-border)] ${rowClass(isCurrentUser)}`}
                  data-testid={`leaderboard-row-${entry.rank}`}
                >
                  <td className="px-[var(--space-3)] py-[var(--space-3)] font-semibold">
                    {entry.rank}
                  </td>
                  <td className="px-[var(--space-3)] py-[var(--space-3)]">{entry.displayName}</td>
                  <td className="px-[var(--space-3)] py-[var(--space-3)] font-semibold">
                    {entry.gamesPlayed}
                  </td>
                  <td className="px-[var(--space-3)] py-[var(--space-3)] font-mono">
                    {formatRating(entry.rating, entry.ratingGamesPlayed)}
                  </td>
                  <td className="px-[var(--space-3)] py-[var(--space-3)] text-[var(--color-text-muted)]">
                    {formatLastActive(entry.lastActiveAt)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {pinnedCurrentUser && !entries.some((entry) => entry.userId === pinnedCurrentUser.userId) ? (
        <div
          className="border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-[var(--space-3)]"
          data-testid="leaderboard-current-user-pinned"
        >
          <p className="text-[var(--text-xs)] text-[var(--color-text-muted)]">Vị trí của bạn</p>
          <div className="mt-[var(--space-2)] flex items-center justify-between gap-[var(--space-3)]">
            <div>
              <p className="text-[var(--text-sm)] font-semibold">
                #{pinnedCurrentUser.rank} {pinnedCurrentUser.displayName}
              </p>
              <p className="text-[var(--text-xs)] text-[var(--color-text-muted)]">
                {pinnedCurrentUser.gamesPlayed} trận trong tháng này
              </p>
            </div>
            <p className="font-mono text-[var(--text-sm)] text-[var(--color-text-muted)]">
              {formatRating(pinnedCurrentUser.rating, pinnedCurrentUser.ratingGamesPlayed)}
            </p>
          </div>
        </div>
      ) : null}

      {totalPages > 1 ? (
        <nav
          aria-label="Phân trang bảng xếp hạng"
          className="flex items-center justify-between border-t border-[var(--color-border)] pt-[var(--space-3)]"
        >
          <Link
            href={page > 1 ? `/leaderboard?page=${page - 1}` : '/leaderboard'}
            aria-disabled={page === 1}
            className={`border border-[var(--color-border)] px-[var(--space-3)] py-[var(--space-2)] ${
              page === 1
                ? 'pointer-events-none opacity-50'
                : 'hover:bg-[var(--color-surface-elevated)]'
            }`}
          >
            Trang trước
          </Link>
          <p className="text-[var(--text-sm)] text-[var(--color-text-muted)]">
            Trang {page}/{totalPages}
          </p>
          <Link
            href={page < totalPages ? `/leaderboard?page=${page + 1}` : `/leaderboard?page=${page}`}
            aria-disabled={page === totalPages}
            className={`border border-[var(--color-border)] px-[var(--space-3)] py-[var(--space-2)] ${
              page === totalPages
                ? 'pointer-events-none opacity-50'
                : 'hover:bg-[var(--color-surface-elevated)]'
            }`}
          >
            Trang sau
          </Link>
        </nav>
      ) : null}
    </div>
  );
}
