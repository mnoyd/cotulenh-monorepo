import type { Metadata } from 'next';
import Link from 'next/link';

import { ActiveGamesSection } from '@/components/dashboard/active-games-section';
import { LeaderboardSection } from '@/components/dashboard/leaderboard-section';
import { OnlineFriendsSection } from '@/components/dashboard/online-friends-section';
import { QuickActions } from '@/components/dashboard/quick-actions';
import { RecentGamesSection } from '@/components/dashboard/recent-games-section';

export const metadata: Metadata = {
  title: 'Bảng điều khiển',
  description: 'Điểm vào chính của người chơi CoTuLenh.'
};

export default function DashboardPage() {
  const navigationCards = [
    { href: '/play', label: 'Chơi' },
    { href: '#active-games', label: 'Ván đang chơi' },
    { href: '#recent-games', label: 'Ván gần đây' }
  ] as const;

  return (
    <div className="grid grid-cols-1 gap-[var(--space-4)] p-[var(--space-4)] lg:grid-cols-[1fr_320px]">
      <nav
        aria-label="Điều hướng bảng điều khiển"
        className="grid grid-cols-1 gap-[var(--space-3)] sm:grid-cols-3 lg:col-span-2"
      >
        {navigationCards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="flex min-h-[72px] items-center justify-center border border-[var(--color-border)] px-[var(--space-4)] text-center text-[var(--text-sm)] font-medium text-[var(--color-text)] hover:bg-[var(--color-surface-elevated)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
          >
            {card.label}
          </Link>
        ))}
      </nav>
      <div className="space-y-[var(--space-4)]">
        <QuickActions />
        <ActiveGamesSection />
        <RecentGamesSection />
      </div>
      <div className="space-y-[var(--space-4)]">
        <OnlineFriendsSection />
        <LeaderboardSection />
      </div>
    </div>
  );
}
