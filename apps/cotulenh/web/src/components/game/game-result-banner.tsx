'use client';

import { useEffect, useRef, useCallback } from 'react';

import type { GameStatus } from '@/lib/types/game';

type GameResultBannerProps = {
  status: GameStatus;
  winner: 'red' | 'blue' | null;
  myColor: 'red' | 'blue';
  resultReason?: string | null;
  onNewGame: () => void;
  onDismiss?: () => void;
};

function getOutcomeText(winner: 'red' | 'blue' | null, myColor: 'red' | 'blue'): string {
  if (winner === null) return 'Hòa!';
  return winner === myColor ? 'Bạn thắng!' : 'Bạn thua!';
}

function getMethodText(status: GameStatus, resultReason?: string | null): string {
  switch (status) {
    case 'checkmate':
      return 'Chiếu hết';
    case 'timeout':
      return 'Hết giờ';
    case 'stalemate':
      return 'Bế tắc';
    case 'draw': {
      if (resultReason === 'fifty_move_rule') return 'Hòa theo luật 50 nước';
      if (resultReason === 'threefold_repetition') return 'Hòa do lặp lại 3 lần';
      return 'Hòa';
    }
    case 'resign':
      return 'Đầu hàng';
    default:
      return '';
  }
}

export function GameResultBanner({
  status,
  winner,
  myColor,
  resultReason,
  onNewGame,
  onDismiss
}: GameResultBannerProps) {
  const bannerRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Trap focus within the banner
  useEffect(() => {
    previousFocusRef.current = document.activeElement as HTMLElement;
    const firstButton = bannerRef.current?.querySelector('button:not([disabled])') as HTMLElement;
    firstButton?.focus();

    return () => {
      previousFocusRef.current?.focus();
    };
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape' && onDismiss) {
        onDismiss();
        return;
      }

      if (e.key !== 'Tab') return;

      const focusableElements = bannerRef.current?.querySelectorAll(
        'button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (!focusableElements || focusableElements.length === 0) return;

      const first = focusableElements[0] as HTMLElement;
      const last = focusableElements[focusableElements.length - 1] as HTMLElement;

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    },
    [onDismiss]
  );

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget && onDismiss) {
        onDismiss();
      }
    },
    [onDismiss]
  );

  const outcomeText = getOutcomeText(winner, myColor);
  const methodText = getMethodText(status, resultReason);
  const isWin = winner === myColor;
  const isDraw = winner === null;

  return (
    <div
      className="absolute inset-0 z-10 flex items-start justify-center bg-black/50 p-[var(--space-2)] sm:items-center"
      onClick={handleBackdropClick}
      data-testid="game-result-backdrop"
    >
      <div
        ref={bannerRef}
        role="alertdialog"
        aria-modal="true"
        aria-label={outcomeText}
        className="mt-[var(--space-2)] w-full max-w-[280px] rounded-lg bg-[var(--color-surface-elevated)] p-[var(--space-3)] text-center shadow-lg sm:mt-0 sm:max-w-[400px] sm:p-[var(--space-4)]"
        onKeyDown={handleKeyDown}
        data-testid="game-result-banner"
      >
        {/* Outcome text */}
        <h2
          className={`text-[var(--text-2xl)] font-bold ${
            isWin ? 'text-green-400' : isDraw ? 'text-yellow-400' : 'text-red-400'
          }`}
          data-testid="game-result-outcome"
        >
          {outcomeText}
        </h2>

        {/* Method text */}
        {methodText ? (
          <p
            className="mt-[var(--space-1)] text-[var(--text-sm)] text-[var(--color-text-muted)]"
            data-testid="game-result-method"
          >
            {methodText}
          </p>
        ) : null}

        {/* Action buttons */}
        <div className="mt-[var(--space-4)] flex flex-col gap-[var(--space-2)] sm:flex-row sm:justify-center">
          <button
            disabled
            className="rounded border border-[var(--color-border)] px-[var(--space-4)] py-[var(--space-2)] text-[var(--text-sm)] text-[var(--color-text-muted)] opacity-50"
            data-testid="game-result-rematch"
          >
            Tái đấu
          </button>
          <button
            onClick={onNewGame}
            className="rounded bg-[var(--color-primary)] px-[var(--space-4)] py-[var(--space-2)] text-[var(--text-sm)] text-white hover:bg-[var(--color-primary-hover)]"
            data-testid="game-result-new-game"
          >
            Ván mới
          </button>
          <button
            disabled
            className="rounded border border-[var(--color-border)] px-[var(--space-4)] py-[var(--space-2)] text-[var(--text-sm)] text-[var(--color-text-muted)] opacity-50"
            data-testid="game-result-review"
          >
            Xem lại
          </button>
        </div>
      </div>
    </div>
  );
}
