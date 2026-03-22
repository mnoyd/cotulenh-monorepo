'use client';

import { BookOpen, Home, Settings, Swords, User } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const topNavItems = [
  { href: '/dashboard', label: 'Trang chủ', icon: Home },
  { href: '/play', label: 'Chơi', icon: Swords },
  { href: '/learn', label: 'Học', icon: BookOpen }
] as const;

const bottomNavItems = [
  { href: '/profile', label: 'Hồ sơ', icon: User },
  { href: '/settings', label: 'Cài đặt', icon: Settings }
] as const;

function isRouteActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Thanh điều hướng"
      className="fixed left-0 top-0 z-40 hidden h-full w-[48px] flex-col border-r border-[var(--sidebar-border)] bg-[var(--sidebar)] lg:flex"
    >
      <div className="flex flex-1 flex-col items-center justify-between py-[var(--space-2)]">
        <div className="flex flex-col items-center">
          {topNavItems.map((item) => {
            const isActive = isRouteActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label={item.label}
                aria-current={isActive ? 'page' : undefined}
                title={item.label}
                className={`flex h-[48px] w-[48px] items-center justify-center border-l-[3px] hover:bg-[var(--sidebar-accent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] ${
                  isActive
                    ? 'border-[var(--sidebar-primary)] text-[var(--sidebar-primary)]'
                    : 'border-transparent text-[var(--color-text-muted)]'
                }`}
              >
                <item.icon size={20} />
              </Link>
            );
          })}
        </div>
        <div className="flex flex-col items-center">
          {bottomNavItems.map((item) => {
            const isActive = isRouteActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label={item.label}
                aria-current={isActive ? 'page' : undefined}
                title={item.label}
                className={`flex h-[48px] w-[48px] items-center justify-center border-l-[3px] hover:bg-[var(--sidebar-accent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] ${
                  isActive
                    ? 'border-[var(--sidebar-primary)] text-[var(--sidebar-primary)]'
                    : 'border-transparent text-[var(--color-text-muted)]'
                }`}
              >
                <item.icon size={20} />
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
