'use client';

import { useEffect, useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';

import type { Dests } from '@cotulenh/board';
import type { AiDifficulty } from '@/lib/ai-engine';
import { useAiGameStore } from '@/stores/ai-game-store';

import { BoardContainer } from './board-container';
import { PlayerInfoBar } from './player-info-bar';
import { GameRightPanel } from './game-right-panel';
import { DeployPieceTray } from './deploy-piece-tray';
import { DeployProgressCounter } from './deploy-progress-counter';
import { DeployControls } from './deploy-controls';
import { GameResultBanner } from './game-result-banner';
import { AiDifficultySelector } from './ai-difficulty-selector';

const SYMBOL_TO_ROLE: Record<string, string> = {
  c: 'commander',
  i: 'infantry',
  t: 'tank',
  m: 'militia',
  e: 'engineer',
  a: 'artillery',
  g: 'anti_air',
  s: 'missile',
  f: 'air_force',
  n: 'navy',
  h: 'headquarter'
};

const DIFFICULTY_LABELS: Record<AiDifficulty, string> = {
  easy: 'Dễ',
  medium: 'Trung bình',
  hard: 'Khó'
};

export function AiGameClient() {
  const engine = useAiGameStore((s) => s.engine);
  const phase = useAiGameStore((s) => s.phase);
  const difficulty = useAiGameStore((s) => s.difficulty);
  const playerColor = useAiGameStore((s) => s.playerColor);
  const moveHistory = useAiGameStore((s) => s.moveHistory);
  const winner = useAiGameStore((s) => s.winner);
  const gameStatus = useAiGameStore((s) => s.gameStatus);
  const resultReason = useAiGameStore((s) => s.resultReason);
  const aiThinking = useAiGameStore((s) => s.aiThinking);
  const deploySubmitted = useAiGameStore((s) => s.deploySubmitted);
  const storeDeployMove = useAiGameStore((s) => s.deployMove);
  const cancelDeploy = useAiGameStore((s) => s.cancelDeploy);
  const commitDeploy = useAiGameStore((s) => s.commitDeploy);
  const submitDeploy = useAiGameStore((s) => s.submitDeploy);
  const getDeployablePieces = useAiGameStore((s) => s.getDeployablePieces);
  const getDeployProgress = useAiGameStore((s) => s.getDeployProgress);
  const makePlayerMove = useAiGameStore((s) => s.makePlayerMove);
  const resign = useAiGameStore((s) => s.resign);
  const startGame = useAiGameStore((s) => s.startGame);
  const reset = useAiGameStore((s) => s.reset);

  const router = useRouter();
  const [selectedPiece, setSelectedPiece] = useState<string | null>(null);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [boardFen, setBoardFen] = useState<string | undefined>(undefined);
  const [moveRejected, setMoveRejected] = useState(false);
  const [errorToast, setErrorToast] = useState<string | null>(null);

  // Sync board FEN from engine
  useEffect(() => {
    if (engine) {
      setBoardFen(engine.fen());
    }
  }, [engine, phase, moveHistory.length]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      reset();
    };
  }, [reset]);

  const showErrorToast = useCallback((message: string) => {
    setErrorToast(message);
    setTimeout(() => setErrorToast(null), 3000);
  }, []);

  const handleSelectDifficulty = useCallback(
    (d: AiDifficulty) => {
      startGame(d);
    },
    [startGame]
  );

  const handleDeployMove = useCallback(
    (orig: string, dest: string) => {
      const selectedPieceType = selectedPiece?.split('-')[0];
      const result = storeDeployMove(orig, dest, selectedPieceType);
      if (result && engine) {
        setBoardFen(engine.fen());
        setSelectedPiece(null);
      }
    },
    [storeDeployMove, engine, selectedPiece]
  );

  const handleCancelDeploy = useCallback(() => {
    cancelDeploy();
    if (engine) {
      setBoardFen(engine.fen());
    }
    setSelectedPiece(null);
  }, [cancelDeploy, engine]);

  const handleCommitDeploy = useCallback(() => {
    const sans = commitDeploy();
    if (!sans) return;
    submitDeploy();
    if (engine) {
      setBoardFen(engine.fen());
    }
  }, [commitDeploy, submitDeploy, engine]);

  const handlePlayingMove = useCallback(
    (orig: string, dest: string) => {
      const san = `${orig}${dest}`;
      const result = makePlayerMove(san);
      if (!result.success) {
        setMoveRejected(true);
        showErrorToast(result.error ?? 'Nước đi không hợp lệ');
        setTimeout(() => setMoveRejected(false), 200);
      }
      if (engine) {
        setBoardFen(engine.fen());
      }
    },
    [makePlayerMove, engine, showErrorToast]
  );

  const handlePlayAgain = useCallback(() => {
    if (difficulty) {
      setBannerDismissed(false);
      startGame(difficulty);
    }
  }, [difficulty, startGame]);

  const handleChangeDifficulty = useCallback(() => {
    reset();
    setBannerDismissed(false);
  }, [reset]);

  const handleDismissBanner = useCallback(() => {
    setBannerDismissed(true);
  }, []);

  const handleResign = useCallback(() => {
    resign();
  }, [resign]);

  // Show difficulty selector when idle
  if (phase === 'idle') {
    return (
      <div className="flex h-full items-center justify-center">
        <AiDifficultySelector onSelect={handleSelectDifficulty} />
      </div>
    );
  }

  const isDeploying = phase === 'deploying';
  const isPlaying = phase === 'playing';
  const isEnded = phase === 'ended';
  const orientation = playerColor ?? 'red';
  const boardTrackClass = 'w-full min-w-[min(60vw,60svh)] max-w-[min(92vw,92svh)]';

  const myColorCode = playerColor === 'red' ? 'r' : 'b';
  const isMyTurn = isPlaying && engine && engine.turn() === myColorCode && !aiThinking;

  const deployPieces = isDeploying ? getDeployablePieces() : [];
  const deployProgress = isDeploying ? getDeployProgress() : { current: 0, total: 0 };
  const canCommit = isDeploying && engine ? engine.canCommitSession() : false;

  // Build legal moves map
  const legalMovesMap = (() => {
    if (!isPlaying || !isMyTurn || !engine) return undefined;
    const allMoves = engine.moves({ verbose: true }) as Array<{
      from: string;
      to: string | Map<string, unknown>;
      piece: { type: string };
    }>;
    const map = new Map() as Dests;
    for (const m of allMoves) {
      if (typeof m.to !== 'string') continue;
      const role = SYMBOL_TO_ROLE[m.piece.type] ?? m.piece.type;
      const origKey = `${m.from}.${role}`;
      const existing = map.get(origKey as never) ?? [];
      existing.push({ square: m.to as never });
      map.set(origKey as never, existing);
    }
    return map;
  })();

  // AI opponent display name
  const aiLabel = `AI — ${difficulty ? DIFFICULTY_LABELS[difficulty] : ''}`;

  // Player bars: red (bottom) vs blue (top)
  const topPlayer = { name: aiLabel, rating: 0, color: 'blue' as const };
  const bottomPlayer = { name: 'Bạn', rating: 0, color: 'red' as const };
  const isRedTurn = moveHistory.length % 2 === 0;
  const topActive = !isRedTurn;
  const bottomActive = isRedTurn;

  return (
    <div className="flex h-full flex-col lg:flex-row" data-testid="ai-game-page">
      {/* Board section */}
      <div className="flex flex-1 shrink-0 flex-col items-center justify-center p-[var(--space-2)] lg:p-[var(--space-4)]">
        {/* Top player bar (AI) */}
        <div className={`mb-[var(--space-2)] ${boardTrackClass}`}>
          <PlayerInfoBar
            name={topPlayer.name}
            rating={0}
            color="blue"
            isActive={topActive && (isPlaying || isDeploying)}
            clockMs={null}
            clockRunning={false}
          />
        </div>

        {/* Deploy progress counter — mobile */}
        {isDeploying && !deploySubmitted ? (
          <div className={`${boardTrackClass} sm:hidden`}>
            <DeployProgressCounter
              current={deployProgress.current}
              total={deployProgress.total}
              className="p-[var(--space-1)] text-center"
            />
          </div>
        ) : null}

        {/* AI thinking indicator */}
        {aiThinking ? (
          <div
            className={`${boardTrackClass} mb-[var(--space-1)] text-center text-[length:var(--text-sm)] text-[var(--color-text-muted)]`}
            role="status"
            data-testid="ai-thinking"
          >
            AI đang suy nghĩ...
          </div>
        ) : null}

        {/* Board */}
        <div className={`${boardTrackClass} relative shrink-0`}>
          <BoardContainer
            fen={boardFen}
            orientation={orientation}
            viewOnly={isDeploying ? deploySubmitted : !isMyTurn}
            onMove={
              isDeploying && !deploySubmitted
                ? handleDeployMove
                : isPlaying && isMyTurn
                  ? handlePlayingMove
                  : undefined
            }
            legalMoves={legalMovesMap}
            moveRejected={moveRejected}
          />
          {isEnded && !bannerDismissed && gameStatus ? (
            <GameResultBanner
              status={gameStatus}
              winner={winner}
              myColor={playerColor ?? 'red'}
              isRated={false}
              resultReason={resultReason}
              onNewGame={handlePlayAgain}
              onDismiss={handleDismissBanner}
            />
          ) : null}
        </div>

        {/* Error toast */}
        {errorToast ? (
          <div
            className={`${boardTrackClass} mt-[var(--space-1)] rounded bg-red-600/90 px-[var(--space-3)] py-[var(--space-2)] text-center text-[var(--text-sm)] text-white`}
            role="alert"
            data-testid="error-toast"
          >
            {errorToast}
          </div>
        ) : null}

        {/* Deploy tray — below board on mobile */}
        {isDeploying && !deploySubmitted ? (
          <div className={`mt-[var(--space-2)] ${boardTrackClass} lg:hidden`}>
            <DeployPieceTray
              pieces={deployPieces}
              selectedPiece={selectedPiece}
              onSelectPiece={setSelectedPiece}
            />
            <DeployControls
              canCommit={canCommit}
              deploySubmitted={deploySubmitted}
              opponentDeploySubmitted={false}
              onCommit={handleCommitDeploy}
              onUndo={handleCancelDeploy}
            />
          </div>
        ) : null}

        {/* Bottom player bar (You) */}
        <div className={`mt-[var(--space-2)] ${boardTrackClass}`}>
          <PlayerInfoBar
            name={bottomPlayer.name}
            rating={0}
            color="red"
            isActive={bottomActive && (isPlaying || isDeploying)}
            clockMs={null}
            clockRunning={false}
          />
        </div>
      </div>

      {/* Right panel */}
      <div className="w-full border-t border-[var(--color-border)] lg:w-[280px] lg:border-l lg:border-t-0 xl:w-[320px]">
        {isDeploying ? (
          <div className="hidden flex-col gap-[var(--space-2)] p-[var(--space-3)] lg:flex">
            <DeployProgressCounter current={deployProgress.current} total={deployProgress.total} />
            {!deploySubmitted ? (
              <>
                <DeployPieceTray
                  pieces={deployPieces}
                  selectedPiece={selectedPiece}
                  onSelectPiece={setSelectedPiece}
                />
                <DeployControls
                  canCommit={canCommit}
                  deploySubmitted={deploySubmitted}
                  opponentDeploySubmitted={false}
                  onCommit={handleCommitDeploy}
                  onUndo={handleCancelDeploy}
                />
              </>
            ) : null}
          </div>
        ) : (
          <GameRightPanel
            moveHistory={moveHistory}
            phase={phase}
            myColor={playerColor}
            pendingDrawOffer={null}
            pendingTakeback={null}
            onResign={handleResign}
            onOfferDraw={() => {}}
            onAcceptDraw={() => {}}
            onDeclineDraw={() => {}}
            onExpireDrawOffer={() => {}}
            onRequestTakeback={() => {}}
            onAcceptTakeback={() => {}}
            onDeclineTakeback={() => {}}
            onExpireTakeback={() => {}}
            isReviewMode={false}
            isAiGame={true}
          />
        )}

        {/* Post-game AI actions */}
        {isEnded ? (
          <div className="flex flex-col gap-[var(--space-2)] p-[var(--space-3)]">
            <button
              data-testid="play-again-ai"
              onClick={handlePlayAgain}
              className="min-h-[44px] w-full rounded border border-[var(--color-primary)] bg-[var(--color-primary)]/10 px-[var(--space-4)] py-[var(--space-2)] text-[var(--color-primary)] hover:bg-[var(--color-primary)]/20"
            >
              Chơi lại với AI
            </button>
            <button
              data-testid="change-difficulty"
              onClick={handleChangeDifficulty}
              className="min-h-[44px] w-full rounded border border-[var(--color-border)] px-[var(--space-4)] py-[var(--space-2)] text-[var(--color-text)] hover:bg-[var(--color-surface-elevated)]"
            >
              Đổi độ khó
            </button>
            <button
              data-testid="find-opponent"
              onClick={() => router.push('/play')}
              className="min-h-[44px] w-full rounded border border-[var(--color-border)] px-[var(--space-4)] py-[var(--space-2)] text-[var(--color-text)] hover:bg-[var(--color-surface-elevated)]"
            >
              Tìm đối thủ
            </button>
            <button
              data-testid="review-game"
              onClick={handleDismissBanner}
              className="min-h-[44px] w-full rounded border border-[var(--color-border)] px-[var(--space-4)] py-[var(--space-2)] text-[var(--color-text)] hover:bg-[var(--color-surface-elevated)]"
            >
              Xem lại
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
