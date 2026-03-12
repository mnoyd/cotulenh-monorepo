import { BookOpen, Plus, Swords, Trophy } from 'lucide-react';
import Link from 'next/link';

const actions = [
  { href: '/play', label: 'Chơi với AI', icon: Swords },
  { href: '/play', label: 'Tạo ván đấu', icon: Plus },
  { href: '/play', label: 'Giải đấu', icon: Trophy },
  { href: '/learn', label: 'Học', icon: BookOpen }
] as const;

export function QuickActions() {
  return (
    <div className="grid grid-cols-2 gap-[var(--space-4)]">
      {actions.map((action) => (
        <Link
          key={action.label}
          href={action.href}
          aria-label={action.label}
          className="flex min-h-[100px] flex-col items-center justify-center gap-[var(--space-2)] border border-[var(--color-border)] p-[var(--space-4)] hover:bg-[var(--color-surface-elevated)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
        >
          <action.icon size={24} className="text-[var(--color-primary)]" />
          <span className="text-[var(--text-sm)] font-medium text-[var(--color-text)]">
            {action.label}
          </span>
        </Link>
      ))}
    </div>
  );
}
