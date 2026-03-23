'use client';

import { useEffect, useRef, useCallback, useState } from 'react';

import type { GameStatus } from '@/lib/types/game';

type RematchStatus = 'idle' | 'sent' | 'received' | 'accepted' | 'declined' | 'expired';

type GameResultBannerProps = {
  status: GameStatus;
  winner: 'red' | 'blue' | null;
  myColor: 'red' | 'blue';
  resultReason?: string | null;
  rematchStatus?: RematchStatus;
  onNewGame: () => void;
  onRematch?: () => void;
  onAcceptRematch?: () => void;
  onDeclineRematch?: () => void;
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
      if (resultReason === 'mutual_agreement') return 'Đồng ý hòa';
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
  rematchStatus = 'idle',
  onNewGame,
  onRematch,
  onAcceptRematch,
  onDeclineRematch,
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

  // Countdown timer for sent state
  const [countdown, setCountdown] = useState(60);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (rematchStatus === 'sent') {
      setCountdown(60);
      countdownRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            if (countdownRef.current) clearInterval(countdownRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
    }

    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [rematchStatus]);

  // Hide rematch for aborted/disputed games
  const showRematch = status !== 'aborted' && status !== 'dispute';

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
        className="mt-[var(--space-2)] w-full max-w-[280px] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-[var(--space-3)] text-center sm:mt-0 sm:max-w-[400px] sm:p-[var(--space-4)]"
        onKeyDown={handleKeyDown}
        data-testid="game-result-banner"
      >
        {/* Outcome text */}
        <h2
          className={`text-[var(--text-2xl)] font-bold ${
            isWin
              ? 'text-[var(--color-success)]'
              : isDraw
                ? 'text-[var(--color-warning)]'
                : 'text-[var(--color-error)]'
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
          {showRematch ? (
            rematchStatus === 'received' ? (
              <div
                className="flex flex-col items-center gap-[var(--space-1)]"
                data-testid="game-result-rematch-received"
              >
                <span className="text-[var(--text-sm)] text-[var(--color-text-muted)]">
                  Đối thủ mời tái đấu
                </span>
                <div className="flex gap-[var(--space-2)]">
                  <button
                    onClick={onAcceptRematch}
                    className="bg-[var(--color-primary)] px-[var(--space-4)] py-[var(--space-2)] text-[var(--text-sm)] text-white hover:bg-[var(--color-primary-hover)]"
                    data-testid="game-result-rematch-accept"
                  >
                    Chấp nhận
                  </button>
                  <button
                    onClick={onDeclineRematch}
                    className="border border-[var(--color-border)] px-[var(--space-4)] py-[var(--space-2)] text-[var(--text-sm)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)]"
                    data-testid="game-result-rematch-decline"
                  >
                    Từ chối
                  </button>
                </div>
              </div>
            ) : rematchStatus === 'sent' ? (
              <button
                disabled
                className="border border-[var(--color-border)] px-[var(--space-4)] py-[var(--space-2)] text-[var(--text-sm)] text-[var(--color-text-muted)] opacity-50"
                data-testid="game-result-rematch"
              >
                Đã mời tái đấu ({countdown}s)
              </button>
            ) : rematchStatus === 'accepted' ? (
              <button
                disabled
                className="border border-[var(--color-border)] px-[var(--space-4)] py-[var(--space-2)] text-[var(--text-sm)] text-[var(--color-text-muted)] opacity-50"
                data-testid="game-result-rematch"
              >
                Đang tạo ván mới...
              </button>
            ) : rematchStatus === 'declined' ? (
              <button
                disabled
                className="border border-[var(--color-border)] px-[var(--space-4)] py-[var(--space-2)] text-[var(--text-sm)] text-[var(--color-text-muted)] opacity-50"
                data-testid="game-result-rematch"
              >
                Đối thủ từ chối tái đấu
              </button>
            ) : (
              <button
                onClick={onRematch}
                className="border border-[var(--color-border)] px-[var(--space-4)] py-[var(--space-2)] text-[var(--text-sm)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)]"
                data-testid="game-result-rematch"
              >
                Tái đấu
              </button>
            )
          ) : null}
          <button
            onClick={onNewGame}
            className="bg-[var(--color-primary)] px-[var(--space-4)] py-[var(--space-2)] text-[var(--text-sm)] text-white hover:bg-[var(--color-primary-hover)]"
            data-testid="game-result-new-game"
          >
            Ván mới
          </button>
          <button
            disabled
            className="border border-[var(--color-border)] px-[var(--space-4)] py-[var(--space-2)] text-[var(--text-sm)] text-[var(--color-text-muted)] opacity-50"
            data-testid="game-result-review"
          >
            Xem lại
          </button>
        </div>
      </div>
    </div>
  );
}
