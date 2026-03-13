import { cn } from '@/lib/utils/cn';

type HintDisplayProps = {
  text: string | null;
  className?: string;
};

export function HintDisplay({ text, className }: HintDisplayProps) {
  if (!text) return null;

  return (
    <div
      className={cn(
        'border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-[var(--space-3)] text-[var(--text-sm)] text-[var(--color-text)]',
        className
      )}
      role="status"
      aria-live="polite"
    >
      {text}
    </div>
  );
}
