import type { ReactNode } from 'react';

import { cn } from '@/lib/utils/cn';

type LessonLayoutProps = {
  board: ReactNode;
  panel: ReactNode;
  className?: string;
};

export function LessonLayout({ board, panel, className }: LessonLayoutProps) {
  return (
    <div className={cn('flex h-full flex-col lg:flex-row', className)}>
      <div className="flex shrink-0 items-center justify-center lg:w-[60%]">{board}</div>
      <div className="min-h-0 flex-1 overflow-y-auto border-t border-[var(--color-border)] lg:border-l lg:border-t-0">
        {panel}
      </div>
    </div>
  );
}
