import Link from 'next/link';

import type { GameHistoryEntry } from '@/lib/game-history';

type GameHistoryTableProps = {
  games: GameHistoryEntry[];
  page: number;
  totalPages: number;
};

const RESULT_LABELS: Record<string, string> = {
  win: 'Thắng',
  loss: 'Thua',
  draw: 'Hòa',
  aborted: 'Hủy'
};

function resultColorClass(result: GameHistoryEntry['result']): string {
  switch (result) {
    case 'win':
      return 'text-[var(--color-success)]';
    case 'loss':
      return 'text-[var(--color-error)]';
    default:
      return 'text-[var(--color-text-muted)]';
  }
}

function resultBgClass(result: GameHistoryEntry['result']): string {
  switch (result) {
    case 'win':
      return 'bg-[var(--color-success)]/10';
    case 'loss':
      return 'bg-[var(--color-error)]/10';
    default:
      return '';
  }
}

function formatOpponentRating(rating: number, ratingGamesPlayed: number): string {
  return `${rating}${ratingGamesPlayed < 30 ? '?' : ''}`;
}

export function GameHistoryTable({ games, page, totalPages }: GameHistoryTableProps) {
  return (
    <div className="space-y-[var(--space-4)]">
      {/* Mobile cards */}
      <div className="space-y-[var(--space-3)] md:hidden">
        {games.map((game) => (
          <Link
            key={game.id}
            href={`/game/${game.id}`}
            className="block border border-[var(--color-border)] p-[var(--space-3)] text-[var(--color-text)] hover:bg-[var(--color-surface-elevated)]"
            data-testid={`history-card-${game.id}`}
          >
            <div className="flex items-start justify-between gap-[var(--space-2)]">
              <p className="text-[var(--text-sm)]">đấu với {game.opponentDisplayName}</p>
              <p className="font-mono text-[var(--text-xs)] text-[var(--color-text-muted)]">
                {formatOpponentRating(game.opponentRating, game.opponentRatingGamesPlayed)}
              </p>
            </div>
            <div className="mt-[var(--space-1)] flex items-center gap-[var(--space-2)] text-[var(--text-xs)]">
              <span className={`font-semibold ${resultColorClass(game.result)}`}>
                {RESULT_LABELS[game.result]}
              </span>
              {game.resultReasonLabel ? (
                <>
                  <span className="text-[var(--color-text-muted)]">·</span>
                  <span className="text-[var(--color-text-muted)]">{game.resultReasonLabel}</span>
                </>
              ) : null}
            </div>
            <div className="mt-[var(--space-1)] flex items-center gap-[var(--space-2)] text-[var(--text-xs)] text-[var(--color-text-muted)]">
              <span>{game.timeControl}</span>
              <span>·</span>
              <span>{game.relativeDate}</span>
            </div>
          </Link>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="min-w-full border-collapse text-left text-[var(--text-sm)]">
          <thead>
            <tr className="border-b border-[var(--color-border)] text-[var(--color-text-muted)]">
              <th className="px-[var(--space-3)] py-[var(--space-2)] font-medium">Đối thủ</th>
              <th className="px-[var(--space-3)] py-[var(--space-2)] font-medium">Kết quả</th>
              <th className="px-[var(--space-3)] py-[var(--space-2)] font-medium">Cách thức</th>
              <th className="px-[var(--space-3)] py-[var(--space-2)] font-medium">Thời gian</th>
              <th className="px-[var(--space-3)] py-[var(--space-2)] font-medium">Ngày</th>
            </tr>
          </thead>
          <tbody>
            {games.map((game) => (
              <tr
                key={game.id}
                className={`border-b border-[var(--color-border)] ${resultBgClass(game.result)}`}
                data-testid={`history-row-${game.id}`}
              >
                <td className="p-0">
                  <Link
                    href={`/game/${game.id}`}
                    className="block px-[var(--space-3)] py-[var(--space-3)] hover:underline"
                  >
                    {game.opponentDisplayName}
                    <span className="ml-[var(--space-1)] font-mono text-[var(--text-xs)] text-[var(--color-text-muted)]">
                      ({formatOpponentRating(game.opponentRating, game.opponentRatingGamesPlayed)})
                    </span>
                  </Link>
                </td>
                <td className={`p-0 font-semibold ${resultColorClass(game.result)}`}>
                  <Link
                    href={`/game/${game.id}`}
                    className="block px-[var(--space-3)] py-[var(--space-3)] hover:underline"
                  >
                    {RESULT_LABELS[game.result]}
                  </Link>
                </td>
                <td className="p-0 text-[var(--text-xs)] text-[var(--color-text-muted)]">
                  <Link
                    href={`/game/${game.id}`}
                    className="block px-[var(--space-3)] py-[var(--space-3)] hover:underline"
                  >
                    {game.resultReasonLabel}
                  </Link>
                </td>
                <td className="p-0 text-[var(--text-xs)]">
                  <Link
                    href={`/game/${game.id}`}
                    className="block px-[var(--space-3)] py-[var(--space-3)] hover:underline"
                  >
                    {game.timeControl}
                  </Link>
                </td>
                <td className="p-0 text-[var(--text-xs)] text-[var(--color-text-muted)]">
                  <Link
                    href={`/game/${game.id}`}
                    className="block px-[var(--space-3)] py-[var(--space-3)] hover:underline"
                  >
                    {game.relativeDate}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 ? (
        <nav
          aria-label="Phân trang lịch sử"
          className="flex items-center justify-between border-t border-[var(--color-border)] pt-[var(--space-3)]"
        >
          <Link
            href={page > 1 ? `/game-history?page=${page - 1}` : '/game-history'}
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
            href={
              page < totalPages ? `/game-history?page=${page + 1}` : `/game-history?page=${page}`
            }
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
