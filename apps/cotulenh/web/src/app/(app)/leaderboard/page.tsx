import type { Metadata } from 'next';
import { ActivityLeaderboardTable } from '@/components/profile/activity-leaderboard-table';
import { EmptyState } from '@/components/layout/empty-state';
import { getActivityLeaderboard } from '@/lib/leaderboard';
import { Medal } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Bảng xếp hạng',
  description: 'Xếp hạng hoạt động theo tháng.'
};

type LeaderboardPageProps = {
  searchParams?: Promise<{ page?: string }>;
};

export default async function LeaderboardPage({ searchParams }: LeaderboardPageProps) {
  const params = searchParams ? await searchParams : {};
  const currentPage = Math.max(1, Number.parseInt(params.page ?? '1', 10) || 1);
  const { entries, currentUserId, currentUserEntry } = await getActivityLeaderboard();

  if (entries.length === 0) {
    return (
      <div className="p-[var(--space-4)]">
        <section className="border border-[var(--color-border)] p-[var(--space-4)]">
          <div className="mb-[var(--space-4)]">
            <h1 className="text-[var(--text-xl)] font-semibold text-[var(--color-text)]">
              Bảng xếp hạng hoạt động
            </h1>
            <p className="mt-[var(--space-2)] text-[var(--text-sm)] text-[var(--color-text-muted)]">
              Theo dõi những người chơi hoạt động nhiều nhất trong tháng này.
            </p>
          </div>
          <EmptyState
            icon={Medal}
            message="Chưa có trận hoàn thành nào trong tháng này"
            actionLabel="Tìm đối thủ"
            actionHref="/play"
          />
        </section>
      </div>
    );
  }

  const totalPages = Math.max(1, Math.ceil(entries.length / 20));
  const page = Math.min(currentPage, totalPages);
  const pageEntries = entries.slice((page - 1) * 20, page * 20);

  return (
    <div className="p-[var(--space-4)]">
      <section className="border border-[var(--color-border)] p-[var(--space-4)]">
        <div className="mb-[var(--space-4)] flex flex-col gap-[var(--space-2)]">
          <h1 className="text-[var(--text-xl)] font-semibold text-[var(--color-text)]">
            Bảng xếp hạng hoạt động
          </h1>
          <p className="max-w-2xl text-[var(--text-sm)] text-[var(--color-text-muted)]">
            Xếp hạng người chơi theo số trận đã hoàn thành trong tháng này. Bảng hiển thị tối đa 50
            người chơi và chia thành các trang 20 dòng.
          </p>
        </div>
        <ActivityLeaderboardTable
          entries={pageEntries}
          currentUserId={currentUserId}
          pinnedCurrentUser={currentUserEntry}
          page={page}
          totalPages={totalPages}
        />
      </section>
    </div>
  );
}
