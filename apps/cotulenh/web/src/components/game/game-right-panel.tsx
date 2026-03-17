'use client';

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils/cn';
import { MoveList } from './move-list';

type GameRightPanelProps = {
  moveHistory: string[];
  className?: string;
};

export function GameRightPanel({ moveHistory, className }: GameRightPanelProps) {
  const hasMoves = moveHistory.length > 0;

  return (
    <div className={cn('flex h-full flex-col', className)}>
      <Tabs defaultValue="moves" className="flex h-full flex-col">
        <TabsList variant="line" className="w-full shrink-0 border-b border-[var(--color-border)]">
          <TabsTrigger value="moves" className="data-active:font-bold data-active:underline">
            Nuoc di
          </TabsTrigger>
          <TabsTrigger
            value="chat"
            disabled
            className="data-active:font-bold data-active:underline"
          >
            Tro chuyen
          </TabsTrigger>
        </TabsList>

        <TabsContent value="moves" className="flex min-h-0 flex-1 flex-col">
          {/* Move list area */}
          <MoveList moveHistory={moveHistory} className="flex-1" />

          {/* Move navigation */}
          <div className="flex shrink-0 items-center justify-center gap-[var(--space-1)] border-t border-[var(--color-border)] p-[var(--space-2)]">
            <button
              type="button"
              disabled={!hasMoves}
              className="min-h-[44px] min-w-[44px] border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-surface-elevated)] disabled:opacity-50"
              aria-label="Di den nuoc dau tien"
            >
              ◄◄
            </button>
            <button
              type="button"
              disabled={!hasMoves}
              className="min-h-[44px] min-w-[44px] border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-surface-elevated)] disabled:opacity-50"
              aria-label="Nuoc truoc"
            >
              ◄
            </button>
            <button
              type="button"
              disabled={!hasMoves}
              className="min-h-[44px] min-w-[44px] border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-surface-elevated)] disabled:opacity-50"
              aria-label="Nuoc tiep"
            >
              ►
            </button>
            <button
              type="button"
              disabled={!hasMoves}
              className="min-h-[44px] min-w-[44px] border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-surface-elevated)] disabled:opacity-50"
              aria-label="Di den nuoc cuoi cung"
            >
              ►►
            </button>
          </div>

          {/* Game controls placeholder */}
          <div className="flex shrink-0 items-center justify-center gap-[var(--space-2)] border-t border-[var(--color-border)] p-[var(--space-2)]">
            <button
              type="button"
              disabled
              className="min-h-[44px] flex-1 border border-[var(--color-border)] text-[var(--text-sm)] text-[var(--color-text)] disabled:opacity-50"
              title="Xin dau"
            >
              Xin dau
            </button>
            <button
              type="button"
              disabled
              className="min-h-[44px] flex-1 border border-[var(--color-border)] text-[var(--text-sm)] text-[var(--color-text)] disabled:opacity-50"
              title="Hoa"
            >
              Hoa
            </button>
            <button
              type="button"
              disabled
              className="min-h-[44px] flex-1 border border-[var(--color-border)] text-[var(--text-sm)] text-[var(--color-text)] disabled:opacity-50"
              title="Xin di lai"
            >
              Xin di lai
            </button>
          </div>
        </TabsContent>

        <TabsContent value="chat" className="flex-1 p-[var(--space-3)]">
          <p className="text-[var(--text-sm)] text-[var(--color-text-muted)]">
            Tinh nang tro chuyen se co trong phien ban tiep theo
          </p>
        </TabsContent>
      </Tabs>
    </div>
  );
}
