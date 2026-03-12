import { Gamepad2 } from 'lucide-react';

import { EmptyState } from '@/components/layout/empty-state';

export function ActiveGamesSection() {
  return (
    <section id="active-games" className="border border-[var(--color-border)] p-[var(--space-4)]">
      <h2 className="mb-[var(--space-3)] text-[var(--text-base)] font-semibold text-[var(--color-text)]">
        Ván đấu đang chơi
      </h2>
      <EmptyState
        icon={Gamepad2}
        message="Không có ván đấu đang diễn ra"
        actionLabel="Tìm đối thủ"
        actionHref="/play"
      />
    </section>
  );
}
