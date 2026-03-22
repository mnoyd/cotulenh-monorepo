'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

type GameControlsProps = {
  phase: 'idle' | 'deploying' | 'playing' | 'ended';
  myColor: 'red' | 'blue' | null;
  pendingDrawOffer: 'sent' | 'received' | null;
  pendingTakeback: 'sent' | 'received' | null;
  moveHistoryLength: number;
  onResign: () => void;
  onOfferDraw: () => void;
  onAcceptDraw: () => void;
  onDeclineDraw: () => void;
  onExpireDrawOffer: () => void;
  onRequestTakeback: () => void;
  onAcceptTakeback: () => void;
  onDeclineTakeback: () => void;
  onExpireTakeback: () => void;
};

const RESIGN_CONFIRM_TIMEOUT = 10_000;
const DRAW_EXPIRY_SECONDS = 60;
const TAKEBACK_EXPIRY_SECONDS = 30;

export function GameControls({
  phase,
  myColor,
  pendingDrawOffer,
  pendingTakeback,
  moveHistoryLength,
  onResign,
  onOfferDraw,
  onAcceptDraw,
  onDeclineDraw,
  onExpireDrawOffer,
  onRequestTakeback,
  onAcceptTakeback,
  onDeclineTakeback,
  onExpireTakeback
}: GameControlsProps) {
  const [resignConfirming, setResignConfirming] = useState(false);
  const [drawCountdown, setDrawCountdown] = useState<number | null>(null);
  const [takebackCountdown, setTakebackCountdown] = useState<number | null>(null);
  const resignTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const disabled = phase !== 'playing' || !myColor;

  // Resign confirmation auto-revert
  useEffect(() => {
    if (resignConfirming) {
      resignTimeoutRef.current = setTimeout(() => {
        setResignConfirming(false);
      }, RESIGN_CONFIRM_TIMEOUT);
      return () => {
        if (resignTimeoutRef.current) clearTimeout(resignTimeoutRef.current);
      };
    }
  }, [resignConfirming]);

  // Draw offer countdown
  useEffect(() => {
    if (pendingDrawOffer === 'sent') {
      setDrawCountdown(DRAW_EXPIRY_SECONDS);
      const interval = setInterval(() => {
        setDrawCountdown((prev) => {
          if (prev === null || prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setDrawCountdown(null);
    }
  }, [pendingDrawOffer]);

  useEffect(() => {
    if (pendingDrawOffer === 'sent' && drawCountdown === 0) {
      setDrawCountdown(null);
      onExpireDrawOffer();
    }
  }, [drawCountdown, onExpireDrawOffer, pendingDrawOffer]);

  // Takeback countdown
  useEffect(() => {
    if (pendingTakeback === 'sent') {
      setTakebackCountdown(TAKEBACK_EXPIRY_SECONDS);
      const interval = setInterval(() => {
        setTakebackCountdown((prev) => {
          if (prev === null || prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setTakebackCountdown(null);
    }
  }, [pendingTakeback]);

  useEffect(() => {
    if (pendingTakeback === 'sent' && takebackCountdown === 0) {
      setTakebackCountdown(null);
      onExpireTakeback();
    }
  }, [onExpireTakeback, pendingTakeback, takebackCountdown]);

  // Reset resign confirmation on phase change
  useEffect(() => {
    setResignConfirming(false);
  }, [phase]);

  const handleResignClick = useCallback(() => {
    setResignConfirming(true);
  }, []);

  const handleResignConfirm = useCallback(() => {
    setResignConfirming(false);
    onResign();
  }, [onResign]);

  const handleResignCancel = useCallback(() => {
    setResignConfirming(false);
  }, []);

  const btnBase =
    'min-h-[44px] flex-1 border border-[var(--color-border)] text-[var(--text-sm)] text-[var(--color-text)] disabled:opacity-50';
  const btnAccept =
    'min-h-[44px] flex-1 border border-[var(--color-success)] text-[var(--text-sm)] text-[var(--color-success)] hover:bg-[var(--color-success)]/10';
  const btnDecline =
    'min-h-[44px] flex-1 border border-[var(--color-error)] text-[var(--text-sm)] text-[var(--color-error)] hover:bg-[var(--color-error)]/10';

  return (
    <div
      className="flex shrink-0 items-center justify-center gap-[var(--space-2)] border-t border-[var(--color-border)] p-[var(--space-2)]"
      aria-live="polite"
      data-testid="game-controls"
    >
      {/* RESIGN SECTION */}
      {resignConfirming ? (
        <>
          <span
            className="text-[var(--text-sm)] text-[var(--color-text)]"
            data-testid="resign-confirm-text"
          >
            Đầu hàng?
          </span>
          <button
            type="button"
            className={btnAccept}
            onClick={handleResignConfirm}
            data-testid="resign-confirm-yes"
          >
            Có
          </button>
          <button
            type="button"
            className={btnDecline}
            onClick={handleResignCancel}
            data-testid="resign-confirm-no"
          >
            Không
          </button>
        </>
      ) : (
        <>
          {/* Resign button */}
          <button
            type="button"
            disabled={disabled}
            className={btnBase}
            onClick={handleResignClick}
            title="Đầu hàng"
            data-testid="resign-button"
          >
            Đầu hàng
          </button>

          {/* DRAW SECTION */}
          {pendingDrawOffer === 'received' ? (
            <div
              className="flex flex-1 items-center gap-[var(--space-1)]"
              data-testid="draw-received"
            >
              <span className="text-[var(--text-xs)] text-[var(--color-text)]">
                Đối thủ xin hòa
              </span>
              <button
                type="button"
                className={btnAccept}
                onClick={onAcceptDraw}
                data-testid="draw-accept"
              >
                Chấp nhận
              </button>
              <button
                type="button"
                className={btnDecline}
                onClick={onDeclineDraw}
                data-testid="draw-decline"
              >
                Từ chối
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={disabled || pendingDrawOffer === 'sent'}
              className={btnBase}
              onClick={onOfferDraw}
              title="Xin hòa"
              data-testid="draw-button"
            >
              {pendingDrawOffer === 'sent'
                ? `Đã xin hòa${drawCountdown !== null ? ` (${drawCountdown}s)` : ''}`
                : 'Xin hòa'}
            </button>
          )}

          {/* TAKEBACK SECTION */}
          {pendingTakeback === 'received' ? (
            <div
              className="flex flex-1 items-center gap-[var(--space-1)]"
              data-testid="takeback-received"
            >
              <span className="text-[var(--text-xs)] text-[var(--color-text)]">
                Đối thủ xin đi lại
              </span>
              <button
                type="button"
                className={btnAccept}
                onClick={onAcceptTakeback}
                data-testid="takeback-accept"
              >
                Chấp nhận
              </button>
              <button
                type="button"
                className={btnDecline}
                onClick={onDeclineTakeback}
                data-testid="takeback-decline"
              >
                Từ chối
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={disabled || moveHistoryLength === 0 || pendingTakeback === 'sent'}
              className={btnBase}
              onClick={onRequestTakeback}
              title="Xin đi lại"
              data-testid="takeback-button"
            >
              {pendingTakeback === 'sent'
                ? `Đã xin đi lại${takebackCountdown !== null ? ` (${takebackCountdown}s)` : ''}`
                : 'Xin đi lại'}
            </button>
          )}
        </>
      )}
    </div>
  );
}
