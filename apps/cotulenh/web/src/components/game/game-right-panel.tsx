'use client';

import type { GameData } from '@/lib/types/game';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils/cn';
import { MoveList } from './move-list';
import { GameControls } from './game-controls';
import { PgnExportControls } from './pgn-export-controls';

type GameRightPanelProps = {
  moveHistory: string[];
  phase: 'idle' | 'deploying' | 'playing' | 'ended';
  myColor: 'red' | 'blue' | null;
  pendingDrawOffer: 'sent' | 'received' | null;
  pendingTakeback: 'sent' | 'received' | null;
  onResign: () => void;
  onOfferDraw: () => void;
  onAcceptDraw: () => void;
  onDeclineDraw: () => void;
  onExpireDrawOffer: () => void;
  onRequestTakeback: () => void;
  onAcceptTakeback: () => void;
  onDeclineTakeback: () => void;
  onExpireTakeback: () => void;
  isReviewMode?: boolean;
  currentMoveIndex?: number;
  totalMoves?: number;
  onNavigate?: (action: 'first' | 'prev' | 'next' | 'last') => void;
  onMoveClick?: (index: number) => void;
  gameData?: GameData;
  onPgnCopySuccess?: (message: string) => void;
  onPgnError?: (message: string) => void;
  isAiGame?: boolean;
  className?: string;
};

export function GameRightPanel({
  moveHistory,
  phase,
  myColor,
  pendingDrawOffer,
  pendingTakeback,
  onResign,
  onOfferDraw,
  onAcceptDraw,
  onDeclineDraw,
  onExpireDrawOffer,
  onRequestTakeback,
  onAcceptTakeback,
  onDeclineTakeback,
  onExpireTakeback,
  isReviewMode,
  currentMoveIndex,
  totalMoves,
  onNavigate,
  onMoveClick,
  gameData,
  onPgnCopySuccess,
  onPgnError,
  isAiGame,
  className
}: GameRightPanelProps) {
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
          <MoveList
            moveHistory={moveHistory}
            className="flex-1"
            currentMoveIndex={isReviewMode ? currentMoveIndex : undefined}
            onMoveClick={isReviewMode ? onMoveClick : undefined}
          />

          {/* Move navigation */}
          <div className="flex shrink-0 items-center justify-center gap-[var(--space-1)] border-t border-[var(--color-border)] p-[var(--space-2)]">
            <button
              type="button"
              disabled={!hasMoves || (isReviewMode && currentMoveIndex === 0)}
              onClick={onNavigate ? () => onNavigate('first') : undefined}
              className="min-h-[44px] min-w-[44px] border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-surface-elevated)] disabled:opacity-50"
              aria-label="Di den nuoc dau tien"
            >
              ◄◄
            </button>
            <button
              type="button"
              disabled={!hasMoves || (isReviewMode && currentMoveIndex === 0)}
              onClick={onNavigate ? () => onNavigate('prev') : undefined}
              className="min-h-[44px] min-w-[44px] border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-surface-elevated)] disabled:opacity-50"
              aria-label="Nuoc truoc"
            >
              ◄
            </button>
            <button
              type="button"
              disabled={!hasMoves || (isReviewMode && currentMoveIndex === totalMoves)}
              onClick={onNavigate ? () => onNavigate('next') : undefined}
              className="min-h-[44px] min-w-[44px] border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-surface-elevated)] disabled:opacity-50"
              aria-label="Nuoc tiep"
            >
              ►
            </button>
            <button
              type="button"
              disabled={!hasMoves || (isReviewMode && currentMoveIndex === totalMoves)}
              onClick={onNavigate ? () => onNavigate('last') : undefined}
              className="min-h-[44px] min-w-[44px] border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-surface-elevated)] disabled:opacity-50"
              aria-label="Di den nuoc cuoi cung"
            >
              ►►
            </button>
          </div>

          {/* PGN export controls — review mode only */}
          {isReviewMode && gameData ? (
            <PgnExportControls
              gameData={gameData}
              onCopySuccess={onPgnCopySuccess}
              onError={onPgnError}
            />
          ) : null}

          {/* Game controls — hidden in review mode, resign-only for AI */}
          {isReviewMode ? null : isAiGame ? (
            <div className="shrink-0 border-t border-[var(--color-border)] p-[var(--space-2)]">
              <button
                type="button"
                data-testid="resign-button"
                disabled={phase !== 'playing'}
                onClick={onResign}
                className="min-h-[44px] w-full border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-surface-elevated)] disabled:opacity-50"
              >
                Đầu hàng
              </button>
            </div>
          ) : (
            <GameControls
              phase={phase}
              myColor={myColor}
              pendingDrawOffer={pendingDrawOffer}
              pendingTakeback={pendingTakeback}
              moveHistoryLength={moveHistory.length}
              onResign={onResign}
              onOfferDraw={onOfferDraw}
              onAcceptDraw={onAcceptDraw}
              onDeclineDraw={onDeclineDraw}
              onExpireDrawOffer={onExpireDrawOffer}
              onRequestTakeback={onRequestTakeback}
              onAcceptTakeback={onAcceptTakeback}
              onDeclineTakeback={onDeclineTakeback}
              onExpireTakeback={onExpireTakeback}
            />
          )}
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
