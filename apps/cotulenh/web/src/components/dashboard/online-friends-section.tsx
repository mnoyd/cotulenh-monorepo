import { Users } from 'lucide-react';

import { EmptyState } from '@/components/layout/empty-state';

export function OnlineFriendsSection() {
  return (
    <section className="border border-[var(--color-border)] p-[var(--space-4)]">
      <h2 className="mb-[var(--space-3)] text-[var(--text-base)] font-semibold text-[var(--color-text)]">
        Bạn bè trực tuyến
      </h2>
      <EmptyState
        icon={Users}
        message="Không có bạn trực tuyến"
        actionLabel="Mời bạn bè chơi"
        actionHref="/friends"
      />
    </section>
  );
}
