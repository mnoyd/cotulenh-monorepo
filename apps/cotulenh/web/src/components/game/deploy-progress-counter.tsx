'use client';

import { cn } from '@/lib/utils/cn';

type DeployProgressCounterProps = {
  current: number;
  total: number;
  className?: string;
};

export function DeployProgressCounter({ current, total, className }: DeployProgressCounterProps) {
  return (
    <div
      className={cn(
        'font-[family-name:var(--font-mono)] text-[var(--text-sm)] text-[var(--color-text)]',
        className
      )}
      aria-live="assertive"
      aria-atomic="true"
      role="status"
    >
      Bo tri — Quan {current}/{total}
    </div>
  );
}
