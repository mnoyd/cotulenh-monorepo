import Link from 'next/link';

import { buttonVariants } from '@/components/ui/button-variants';
import { cn } from '@/lib/utils/cn';

type PlaceholderPageProps = {
  title: string;
  description: string;
  primaryAction: {
    href: string;
    label: string;
  };
  secondaryAction?: {
    href: string;
    label: string;
  };
};

export function PlaceholderPage({
  title,
  description,
  primaryAction,
  secondaryAction
}: PlaceholderPageProps) {
  return (
    <main className="px-[var(--space-4)] py-[var(--space-12)] sm:py-[var(--space-16)]">
      <div className="mx-auto flex max-w-[720px] flex-col gap-[var(--space-6)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-[var(--space-8)]">
        <div className="space-y-[var(--space-3)]">
          <p className="text-[var(--text-sm)] font-medium text-[var(--color-primary)]">CoTuLenh</p>
          <h1 className="text-[var(--text-2xl)] font-semibold text-[var(--color-text)]">{title}</h1>
          <p className="text-[var(--text-base)] text-[var(--color-text-muted)]">{description}</p>
        </div>
        <div className="flex flex-col gap-[var(--space-3)] sm:flex-row">
          <Link
            href={primaryAction.href}
            className={cn(buttonVariants({ variant: 'default', size: 'lg' }), 'w-full sm:w-auto')}
          >
            {primaryAction.label}
          </Link>
          {secondaryAction ? (
            <Link
              href={secondaryAction.href}
              className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'w-full sm:w-auto')}
            >
              {secondaryAction.label}
            </Link>
          ) : null}
        </div>
      </div>
    </main>
  );
}
