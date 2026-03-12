import { Medal } from 'lucide-react';

import { EmptyState } from '@/components/layout/empty-state';

export function LeaderboardSection() {
  return (
    <section className="border border-[var(--color-border)] p-[var(--space-4)]">
      <h2 className="mb-[var(--space-3)] text-[var(--text-base)] font-semibold text-[var(--color-text)]">
        Bảng xếp hạng
      </h2>
      <EmptyState
        icon={Medal}
        message="Chơi để lên bảng xếp hạng"
        actionLabel="Tìm đối thủ"
        actionHref="/play"
      />
    </section>
  );
}
