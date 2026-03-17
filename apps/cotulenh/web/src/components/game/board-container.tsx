'use client';

import { useRef, useMemo, useCallback, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

import { useBoard } from '@/hooks/use-board';
import type { BoardHandle } from '@/hooks/use-board';
import type { Config, Key, Piece, OrigMove, DestMove, MoveMetadata, Dests } from '@cotulenh/board';

const ROLE_LABELS: Record<string, string> = {
  commander: 'Tu lenh',
  infantry: 'Bo binh',
  tank: 'Xe tang',
  militia: 'Dan quan',
  engineer: 'Cong binh',
  artillery: 'Phao binh',
  anti_air: 'Phong khong',
  missile: 'Ten lua',
  air_force: 'Khong quan',
  navy: 'Hai quan',
  headquarter: 'So chi huy'
};

const COLOR_LABELS: Record<'red' | 'blue', string> = {
  red: 'Do',
  blue: 'Xanh'
};

function describeSquare(square: Key, piece: Piece | undefined): string {
  if (!piece) {
    return `O ${square}, trong`;
  }
  const color = COLOR_LABELS[piece.color];
  const role = ROLE_LABELS[piece.role] ?? piece.role;
  return `${square}: ${role} ${color}`;
}

type BoardContainerInnerProps = {
  fen?: string;
  orientation?: 'red' | 'blue';
  viewOnly?: boolean;
  onMove?: (orig: string, dest: string) => void;
  onBoardReady?: (handle: BoardHandle) => void;
  legalMoves?: Dests;
  lastMove?: [string, string];
  moveRejected?: boolean;
};

export function BoardContainerInner({
  fen,
  orientation = 'red',
  viewOnly = true,
  onMove,
  onBoardReady,
  legalMoves,
  lastMove,
  moveRejected
}: BoardContainerInnerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<BoardHandle | null>(null);
  const [selectedLegalCount, setSelectedLegalCount] = useState(0);

  const reducedMotion =
    typeof window !== 'undefined'
      ? (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false)
      : false;

  const boardConfig = useMemo<Config>(
    () => ({
      fen: fen ?? 'start',
      orientation,
      viewOnly,
      movable: viewOnly
        ? undefined
        : {
            free: false,
            color: orientation === 'red' ? 'red' : 'blue',
            dests: legalMoves,
            showDests: true,
            events: {
              after: (orig: OrigMove, dest: DestMove, _metadata: MoveMetadata) => {
                onMove?.(orig.square, dest.square);
              }
            }
          },
      lastMove: lastMove as [Key, Key] | undefined,
      animation: {
        enabled: !reducedMotion,
        duration: moveRejected ? 200 : 100
      }
    }),
    [fen, orientation, viewOnly, onMove, legalMoves, lastMove, reducedMotion, moveRejected]
  );

  const handle = useBoard(containerRef, boardConfig);

  const syncAccessibility = useCallback(() => {
    const container = containerRef.current;
    const boardHandle = handleRef.current;
    if (!container || !boardHandle) return;

    requestAnimationFrame(() => {
      const boardState = boardHandle.getState();
      const squares = Array.from(container.querySelectorAll('square')) as Array<
        HTMLElement & { cgKey?: Key }
      >;

      for (const square of squares) {
        const key = square.cgKey;
        if (!key) continue;

        square.tabIndex = 0;
        square.setAttribute('role', 'button');
        square.setAttribute('aria-label', describeSquare(key, boardState.pieces.get(key)));
      }

      const selectedSquare = squares.find((square) => square.classList.contains('selected'));
      if (!selectedSquare?.cgKey || !legalMoves) {
        setSelectedLegalCount(0);
        return;
      }

      const selectedPiece = boardState.pieces.get(selectedSquare.cgKey);
      if (!selectedPiece) {
        setSelectedLegalCount(0);
        return;
      }

      const legalKey = `${selectedSquare.cgKey}.${selectedPiece.role}` as never;
      const legalDests = legalMoves.get(legalKey) ?? [];
      setSelectedLegalCount(legalDests.length);
    });
  }, [legalMoves]);

  useEffect(() => {
    handleRef.current = handle;
    if (handle) {
      onBoardReady?.(handle);
    }
  }, [handle, onBoardReady, syncAccessibility]);

  useEffect(() => {
    if (!handle || !containerRef.current) return;

    syncAccessibility();

    const observer = new MutationObserver(() => {
      syncAccessibility();
    });

    observer.observe(containerRef.current, { subtree: true, childList: true });

    return () => {
      observer.disconnect();
    };
  }, [handle, fen, orientation, syncAccessibility]);

  return (
    <div className="relative">
      <div
        ref={containerRef}
        className={`aspect-square w-full${moveRejected ? ' animate-[flash-red_200ms_ease-out]' : ''}`}
        role="application"
        aria-label="Ban co tu lenh"
      />
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {selectedLegalCount > 0 ? `${selectedLegalCount} nuoc di hop le` : ''}
      </div>
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {lastMove ? `Nuoc di cuoi: ${lastMove[0]} den ${lastMove[1]}` : ''}
      </div>
    </div>
  );
}

export const BoardContainer = dynamic(() => Promise.resolve(BoardContainerInner), {
  ssr: false,
  loading: () => (
    <div className="aspect-square w-full animate-pulse bg-[var(--color-surface-elevated)]" />
  )
});
