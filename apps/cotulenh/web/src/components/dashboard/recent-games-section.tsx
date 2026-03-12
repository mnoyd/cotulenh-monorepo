import { Swords } from 'lucide-react';

import { EmptyState } from '@/components/layout/empty-state';

export function RecentGamesSection() {
  return (
    <section id="recent-games" className="border border-[var(--color-border)] p-[var(--space-4)]">
      <h2 className="mb-[var(--space-3)] text-[var(--text-base)] font-semibold text-[var(--color-text)]">
        Ván đấu gần đây
      </h2>
      <EmptyState
        icon={Swords}
        message="Chưa có ván đấu"
        actionLabel="Chơi ván đầu tiên"
        actionHref="/play"
      />
    </section>
  );
}
