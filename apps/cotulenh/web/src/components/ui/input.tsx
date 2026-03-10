'use client';

import { type InputHTMLAttributes, forwardRef, useId } from 'react';

import { cn } from '@/lib/utils/cn';

type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> & {
  error?: string;
  label: string;
};

const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, error, id, label, ...props },
  ref
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = error ? `${inputId}-error` : undefined;

  return (
    <div className="flex flex-col gap-[var(--space-2)]">
      <label
        htmlFor={inputId}
        className="text-[var(--text-sm)] font-medium text-[var(--color-text)]"
      >
        {label}
      </label>
      <input
        ref={ref}
        id={inputId}
        aria-describedby={errorId}
        aria-invalid={Boolean(error)}
        className={cn(
          'h-11 w-full border bg-[var(--color-surface)] px-[var(--space-3)] text-[var(--text-base)] text-[var(--color-text)] outline-none transition-colors placeholder:text-[var(--color-text-muted)] focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-50',
          error
            ? 'border-[var(--color-error)] focus-visible:ring-[var(--color-error)]'
            : 'border-[var(--color-border)]',
          className
        )}
        {...props}
      />
      {error ? (
        <p id={errorId} className="text-[var(--text-sm)] text-[var(--color-error)]">
          {error}
        </p>
      ) : null}
    </div>
  );
});

export { Input };
export type { InputProps };
