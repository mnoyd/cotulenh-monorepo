'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

import { cn } from '@/lib/utils/cn';

const DISMISSED_KEY = 'signup-prompt-dismissed';

type SignupPromptProps = {
  isAuthenticated: boolean;
  completedLessonCount: number;
  className?: string;
};

export function SignupPrompt({
  isAuthenticated,
  completedLessonCount,
  className
}: SignupPromptProps) {
  const [dismissed, setDismissed] = useState(true); // Default to hidden to avoid flash

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setDismissed(sessionStorage.getItem(DISMISSED_KEY) === 'true');
  }, []);

  if (isAuthenticated || completedLessonCount < 3 || dismissed) {
    return null;
  }

  const handleDismiss = () => {
    sessionStorage.setItem(DISMISSED_KEY, 'true');
    setDismissed(true);
  };

  return (
    <div
      className={cn('border border-[var(--color-primary)] p-[var(--space-4)]', className)}
      role="complementary"
      aria-label="Gợi ý đăng ký"
    >
      <p className="text-[var(--text-base)] font-semibold text-[var(--color-text)]">
        Sẵn sàng chơi với người thật?
      </p>
      <p className="mt-[var(--space-1)] text-[var(--text-sm)] text-[var(--color-text-muted)]">
        Đăng ký để thách đấu trực tuyến và lưu tiến độ học.
      </p>
      <div className="mt-[var(--space-3)] flex items-center gap-[var(--space-3)]">
        <Link
          href="/signup"
          className="inline-block border border-[var(--color-primary)] bg-[var(--color-primary)] px-[var(--space-3)] py-[var(--space-2)] text-[var(--text-sm)] font-medium text-white hover:opacity-90"
        >
          Đăng ký ngay
        </Link>
        <button
          type="button"
          onClick={handleDismiss}
          className="text-[var(--text-sm)] text-[var(--color-text-muted)] hover:underline"
        >
          Để sau
        </button>
      </div>
    </div>
  );
}
