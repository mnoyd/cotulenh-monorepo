'use client';

import { Home, Medal, Settings, Swords, Users } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const tabItems = [
  { href: '/dashboard', label: 'Trang chủ', icon: Home },
  { href: '/play', label: 'Chơi', icon: Swords },
  { href: '/friends', label: 'Bạn bè', icon: Users },
  { href: '/leaderboard', label: 'BXH', icon: Medal },
  { href: '/settings', label: 'Cài đặt', icon: Settings }
] as const;

function isRouteActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function BottomTabBar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Thanh điều hướng"
      className="fixed bottom-0 left-0 z-40 flex h-[calc(56px+env(safe-area-inset-bottom))] w-full gap-[var(--space-2)] border-t border-[var(--color-border)] bg-[var(--color-surface)] px-[var(--space-2)] pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      {tabItems.map((item) => {
        const isActive = isRouteActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-label={item.label}
            aria-current={isActive ? 'page' : undefined}
            className={`flex min-h-[44px] min-w-[44px] flex-1 flex-col items-center justify-center gap-[var(--space-1)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] ${
              isActive ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-muted)]'
            }`}
          >
            <item.icon size={20} />
            <span className="text-[var(--text-xs)] leading-none">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
