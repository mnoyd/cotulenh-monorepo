import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';

type EmptyStateProps = {
  icon: LucideIcon;
  message: string;
  actionLabel: string;
  actionHref: string;
};

export function EmptyState({ icon: Icon, message, actionLabel, actionHref }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-[var(--space-3)] py-[var(--space-8)]">
      <Icon size={32} className="text-[var(--color-text-muted)]" />
      <p className="text-[var(--text-sm)] text-[var(--color-text-muted)]">{message}</p>
      <Link
        href={actionHref}
        aria-label={actionLabel}
        className="text-[var(--text-sm)] text-[var(--color-primary)] hover:underline"
      >
        {actionLabel}
      </Link>
    </div>
  );
}
