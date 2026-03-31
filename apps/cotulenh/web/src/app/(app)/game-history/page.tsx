import type { Metadata } from 'next';
import { GameHistoryTable } from '@/components/profile/game-history-table';
import { EmptyState } from '@/components/layout/empty-state';
import { getGameHistory } from '@/lib/game-history';
import { Swords } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Lịch sử đấu',
  description: 'Xem lại các ván đấu đã hoàn thành.'
};

type GameHistoryPageProps = {
  searchParams?: Promise<{ page?: string }>;
};

const PAGE_SIZE = 20;

export default async function GameHistoryPage({ searchParams }: GameHistoryPageProps) {
  const params = searchParams ? await searchParams : {};
  const currentPage = Math.max(1, Number.parseInt(params.page ?? '1', 10) || 1);
  const initialData = await getGameHistory({ page: currentPage, pageSize: PAGE_SIZE });

  if (initialData.totalCount === 0) {
    return (
      <div className="p-[var(--space-4)]">
        <section className="border border-[var(--color-border)] p-[var(--space-4)]">
          <div className="mb-[var(--space-4)]">
            <h1 className="text-[var(--text-xl)] font-semibold text-[var(--color-text)]">
              Lịch sử đấu
            </h1>
            <p className="mt-[var(--space-2)] text-[var(--text-sm)] text-[var(--color-text-muted)]">
              Xem lại các ván đấu đã hoàn thành của bạn.
            </p>
          </div>
          <EmptyState
            icon={Swords}
            message="Chưa có ván đấu nào"
            actionLabel="Chơi ngay"
            actionHref="/play"
          />
        </section>
      </div>
    );
  }

  const totalPages = Math.max(1, Math.ceil(initialData.totalCount / PAGE_SIZE));
  const page = Math.min(currentPage, totalPages);
  const pageGames =
    page === currentPage
      ? initialData.games
      : (await getGameHistory({ page, pageSize: PAGE_SIZE })).games;

  return (
    <div className="p-[var(--space-4)]">
      <section className="border border-[var(--color-border)] p-[var(--space-4)]">
        <div className="mb-[var(--space-4)] flex flex-col gap-[var(--space-2)]">
          <h1 className="text-[var(--text-xl)] font-semibold text-[var(--color-text)]">
            Lịch sử đấu
          </h1>
          <p className="max-w-2xl text-[var(--text-sm)] text-[var(--color-text-muted)]">
            Xem lại các ván đấu đã hoàn thành. Nhấn vào ván đấu để xem chi tiết.
          </p>
        </div>
        <GameHistoryTable games={pageGames} page={page} totalPages={totalPages} />
      </section>
    </div>
  );
}
