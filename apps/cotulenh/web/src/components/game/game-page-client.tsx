'use client';

import { useEffect, useCallback, useState, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';

import type { GameData } from '@/lib/types/game';
import type { Dests } from '@cotulenh/board';
import { useGameStore } from '@/stores/game-store';
import { useGameChannel } from '@/hooks/use-game-channel';

import { BoardContainer } from './board-container';
import { PlayerInfoBar } from './player-info-bar';
import { GameRightPanel } from './game-right-panel';
import { DeployPieceTray } from './deploy-piece-tray';
import { DeployProgressCounter } from './deploy-progress-counter';
import { DeployControls } from './deploy-controls';
import { GameResultBanner } from './game-result-banner';

type GamePageClientProps = {
  gameData: GameData;
};

export function GamePageClient({ gameData }: GamePageClientProps) {
  const initializeGame = useGameStore((s) => s.initializeGame);
  const initializeEngine = useGameStore((s) => s.initializeEngine);
  const phase = useGameStore((s) => s.phase);
  const moveHistory = useGameStore((s) => s.moveHistory);
  const clocks = useGameStore((s) => s.clocks);
  const getDisplayClocks = useGameStore((s) => s.getDisplayClocks);
  const claimTimeout = useGameStore((s) => s.claimTimeout);
  const activeColor = useGameStore((s) => s.activeColor);
  const clockRunning = useGameStore((s) => s.clockRunning);
  const redPlayer = useGameStore((s) => s.redPlayer);
  const bluePlayer = useGameStore((s) => s.bluePlayer);
  const myColor = useGameStore((s) => s.myColor);
  const gameId = useGameStore((s) => s.gameId);
  const deploySubmitted = useGameStore((s) => s.deploySubmitted);
  const opponentDeploySubmitted = useGameStore((s) => s.opponentDeploySubmitted);
  const engine = useGameStore((s) => s.engine);
  const deployMove = useGameStore((s) => s.deployMove);
  const cancelDeploy = useGameStore((s) => s.cancelDeploy);
  const commitDeploy = useGameStore((s) => s.commitDeploy);
  const setDeploySubmitted = useGameStore((s) => s.setDeploySubmitted);
  const submitDeploy = useGameStore((s) => s.submitDeploy);
  const getDeployablePieces = useGameStore((s) => s.getDeployablePieces);
  const getDeployProgress = useGameStore((s) => s.getDeployProgress);
  const storeMakeMove = useGameStore((s) => s.makeMove);
  const moveError = useGameStore((s) => s.moveError);
  const winner = useGameStore((s) => s.winner);
  const gameStatus = useGameStore((s) => s.gameStatus);
  const resultReason = useGameStore((s) => s.resultReason);
  const ratingChanges = useGameStore((s) => s.ratingChanges);
  const pendingDrawOffer = useGameStore((s) => s.pendingDrawOffer);
  const pendingTakeback = useGameStore((s) => s.pendingTakeback);
  const resign = useGameStore((s) => s.resign);
  const offerDraw = useGameStore((s) => s.offerDraw);
  const acceptDraw = useGameStore((s) => s.acceptDraw);
  const declineDraw = useGameStore((s) => s.declineDraw);
  const requestTakeback = useGameStore((s) => s.requestTakeback);
  const acceptTakeback = useGameStore((s) => s.acceptTakeback);
  const declineTakeback = useGameStore((s) => s.declineTakeback);
  const expireDrawOffer = useGameStore((s) => s.expireDrawOffer);
  const expireTakeback = useGameStore((s) => s.expireTakeback);
  const rematchStatus = useGameStore((s) => s.rematchStatus);
  const rematchNewGameId = useGameStore((s) => s.rematchNewGameId);
  const offerRematch = useGameStore((s) => s.offerRematch);
  const acceptRematch = useGameStore((s) => s.acceptRematch);
  const declineRematch = useGameStore((s) => s.declineRematch);
  const expireRematchOffer = useGameStore((s) => s.expireRematchOffer);
  const storeReset = useGameStore((s) => s.reset);

  const router = useRouter();
  const [selectedPiece, setSelectedPiece] = useState<string | null>(null);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [boardFen, setBoardFen] = useState(gameData.game_state.fen);
  const [moveRejected, setMoveRejected] = useState(false);
  const [errorToast, setErrorToast] = useState<string | null>(null);
  const rematchStatusRef = useRef(rematchStatus);

  // Subscribe to realtime game events
  useGameChannel(gameId);

  useEffect(() => {
    initializeGame(gameData.id, gameData);
    initializeEngine(gameData.game_state.fen);
  }, [gameData, initializeGame, initializeEngine]);

  // Update board FEN when engine changes
  useEffect(() => {
    if (engine) {
      setBoardFen(engine.fen());
    }
  }, [engine, phase]);

  useEffect(() => {
    rematchStatusRef.current = rematchStatus;
  }, [rematchStatus]);

  const handleDeployMove = useCallback(
    (orig: string, dest: string) => {
      const selectedPieceType = selectedPiece?.split('-')[0];
      const result = deployMove(orig, dest, selectedPieceType);
      if (result && engine) {
        setBoardFen(engine.fen());
        setSelectedPiece(null);
      }
    },
    [deployMove, engine, selectedPiece]
  );

  const handleCancelDeploy = useCallback(() => {
    cancelDeploy();
    if (engine) {
      setBoardFen(engine.fen());
    }
    setSelectedPiece(null);
  }, [cancelDeploy, engine]);

  const handleCommitDeploy = useCallback(async () => {
    const sans = commitDeploy();
    if (!sans) return;

    const result = await submitDeploy(sans);
    if (result.success) {
      setDeploySubmitted(true);
    }
  }, [commitDeploy, submitDeploy, setDeploySubmitted]);

  // Playing phase: handle move from board
  const handlePlayingMove = useCallback(
    async (orig: string, dest: string) => {
      const san = `${orig}${dest}`;
      const result = await storeMakeMove(san);
      if (!result.success) {
        setMoveRejected(true);
        setErrorToast(result.error ?? 'Nuoc di khong hop le');
        setTimeout(() => setMoveRejected(false), 200);
        setTimeout(() => setErrorToast(null), 3000);
      }
      if (engine) {
        setBoardFen(engine.fen());
      }
    },
    [storeMakeMove, engine]
  );

  // Show error toast when moveError changes
  useEffect(() => {
    if (moveError) {
      setErrorToast(moveError);
      setMoveRejected(true);
      setTimeout(() => setMoveRejected(false), 200);
      setTimeout(() => setErrorToast(null), 3000);
    }
  }, [moveError]);

  const isDeploying = phase === 'deploying';
  const isPlaying = phase === 'playing';
  const isEnded = phase === 'ended';

  const handleNewGame = useCallback(() => {
    router.push('/dashboard');
  }, [router]);

  const handleDismissBanner = useCallback(() => {
    setBannerDismissed(true);
  }, []);

  // Navigate to new game on rematch accepted
  useEffect(() => {
    if (rematchStatus === 'accepted' && rematchNewGameId) {
      storeReset();
      router.push(`/game/${rematchNewGameId}`);
    }
  }, [rematchStatus, rematchNewGameId, storeReset, router]);

  // Re-show banner when rematch offer received while dismissed
  useEffect(() => {
    if (rematchStatus === 'received' && bannerDismissed) {
      setBannerDismissed(false);
    }
  }, [rematchStatus, bannerDismissed]);

  // Client-side rematch expiry timer
  useEffect(() => {
    if (rematchStatus !== 'sent') return;

    const timerId = window.setTimeout(() => {
      void expireRematchOffer();
    }, 60_000);

    return () => window.clearTimeout(timerId);
  }, [rematchStatus, expireRematchOffer]);

  useEffect(() => {
    if (rematchStatus !== 'declined') return;

    const timerId = window.setTimeout(() => {
      useGameStore.getState().handleRematchExpired();
    }, 3_000);

    return () => window.clearTimeout(timerId);
  }, [rematchStatus]);

  useEffect(() => {
    return () => {
      if (rematchStatusRef.current === 'received') {
        void useGameStore.getState().declineRematch();
      }
    };
  }, []);
  const deployPieces = isDeploying ? getDeployablePieces() : [];
  const deployProgress = isDeploying ? getDeployProgress() : { current: 0, total: 0 };
  const canCommit = isDeploying && engine ? engine.canCommitSession() : false;

  const orientation = myColor ?? 'red';
  const boardTrackClass = 'w-full min-w-[min(60vw,60svh)] max-w-[min(92vw,92svh)]';
  const isRedTurn = moveHistory.length % 2 === 0;
  const myColorCode = myColor === 'red' ? 'r' : 'b';
  const isMyTurn = isPlaying && engine && engine.turn() === myColorCode;

  // Symbol-to-role mapping for building board Dests
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

  // Build legal moves map for board highlighting (Dests = Map<OrigMoveKey, DestMove[]>)
  const legalMovesMap = useMemo<Dests | undefined>(() => {
    if (!isPlaying || !isMyTurn || !engine) return undefined;
    const allMoves = engine.moves({ verbose: true }) as Array<{
      from: string;
      to: string | Map<string, unknown>;
      piece: { type: string };
    }>;
    const map = new Map() as Dests;
    for (const m of allMoves) {
      if (typeof m.to !== 'string') continue; // Skip compound moves
      const role = SYMBOL_TO_ROLE[m.piece.type] ?? m.piece.type;
      const origKey = `${m.from}.${role}`;
      const existing = map.get(origKey as never) ?? [];
      existing.push({ square: m.to as never });
      map.set(origKey as never, existing);
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, isMyTurn, engine, moveHistory.length]);

  // Compute last move for highlight
  const lastMove = useMemo<[string, string] | undefined>(() => {
    if (moveHistory.length === 0) return undefined;
    const last = moveHistory[moveHistory.length - 1];
    // SAN moves like "e2e4" — extract from/to squares (first 2 chars each)
    if (last && last.length >= 4) {
      return [last.slice(0, 2), last.slice(2, 4)];
    }
    return undefined;
  }, [moveHistory]);

  const topPlayer = orientation === 'red' ? bluePlayer : redPlayer;
  const bottomPlayer = orientation === 'red' ? redPlayer : bluePlayer;
  const topColor = orientation === 'red' ? 'blue' : 'red';
  const bottomColor = orientation === 'red' ? 'red' : 'blue';
  // AI detection stub for future backend fields.
  const isAIGame =
    isAIPlayer(gameData.red_player as unknown) || isAIPlayer(gameData.blue_player as unknown);
  const displayClocks = getDisplayClocks() ?? clocks;
  const topActive = topColor === 'red' ? isRedTurn : !isRedTurn;
  const bottomActive = bottomColor === 'red' ? isRedTurn : !isRedTurn;
  const topClock = isAIGame
    ? null
    : displayClocks
      ? topColor === 'red'
        ? displayClocks.red
        : displayClocks.blue
      : null;
  const bottomClock = isAIGame
    ? null
    : displayClocks
      ? bottomColor === 'red'
        ? displayClocks.red
        : displayClocks.blue
      : null;
  const topClockRunning = clockRunning && topColor === activeColor;
  const bottomClockRunning = clockRunning && bottomColor === activeColor;

  useEffect(() => {
    if (!isPlaying || !myColor || !clockRunning) return;

    const intervalId = window.setInterval(() => {
      const currentClocks = getDisplayClocks();
      if (!currentClocks) return;

      const opponentClock = myColor === 'red' ? currentClocks.blue : currentClocks.red;
      if (opponentClock <= 0) {
        void claimTimeout();
      }
    }, 500);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [isPlaying, myColor, clockRunning, getDisplayClocks, claimTimeout]);

  return (
    <div className="flex h-full flex-col lg:flex-row">
      {/* Board section */}
      <div className="flex flex-1 shrink-0 flex-col items-center justify-center p-[var(--space-2)] lg:p-[var(--space-4)]">
        {/* Top player bar */}
        {topPlayer ? (
          <div className={`mb-[var(--space-2)] ${boardTrackClass}`}>
            <PlayerInfoBar
              name={topPlayer.name}
              rating={topPlayer.rating}
              ratingGamesPlayed={topPlayer.ratingGamesPlayed}
              color={topColor}
              isActive={topActive && (phase === 'playing' || phase === 'deploying')}
              clockMs={topClock}
              clockRunning={topClockRunning}
            />
          </div>
        ) : null}

        {/* Deploy progress counter — mobile overlay */}
        {isDeploying && !deploySubmitted ? (
          <div className={`${boardTrackClass} sm:hidden`}>
            <DeployProgressCounter
              current={deployProgress.current}
              total={deployProgress.total}
              className="p-[var(--space-1)] text-center"
            />
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
            lastMove={lastMove}
            moveRejected={moveRejected}
          />
          {isEnded && !bannerDismissed && gameStatus ? (
            <GameResultBanner
              status={gameStatus}
              winner={winner}
              myColor={myColor ?? 'red'}
              ratingChanges={ratingChanges}
              isRated={gameData.is_rated}
              resultReason={resultReason}
              rematchStatus={rematchStatus}
              onNewGame={handleNewGame}
              onRematch={offerRematch}
              onAcceptRematch={acceptRematch}
              onDeclineRematch={declineRematch}
              onDismiss={handleDismissBanner}
            />
          ) : null}
        </div>

        {/* Error toast */}
        {errorToast ? (
          <div
            className={`${boardTrackClass} mt-[var(--space-1)] rounded bg-red-600/90 px-[var(--space-3)] py-[var(--space-2)] text-center text-[var(--text-sm)] text-white`}
            role="alert"
          >
            {errorToast}
          </div>
        ) : null}

        {/* Deploy piece tray — below board on mobile/tablet */}
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
              opponentDeploySubmitted={opponentDeploySubmitted}
              onCommit={handleCommitDeploy}
              onUndo={handleCancelDeploy}
            />
          </div>
        ) : null}

        {/* Waiting indicator — below board on mobile */}
        {isDeploying && deploySubmitted ? (
          <div className={`mt-[var(--space-2)] ${boardTrackClass} lg:hidden`}>
            <DeployControls
              canCommit={false}
              deploySubmitted={true}
              opponentDeploySubmitted={opponentDeploySubmitted}
              onCommit={() => {}}
              onUndo={() => {}}
            />
          </div>
        ) : null}

        {/* Bottom player bar */}
        {bottomPlayer ? (
          <div className={`mt-[var(--space-2)] ${boardTrackClass}`}>
            <PlayerInfoBar
              name={bottomPlayer.name}
              rating={bottomPlayer.rating}
              ratingGamesPlayed={bottomPlayer.ratingGamesPlayed}
              color={bottomColor}
              isActive={bottomActive && (phase === 'playing' || phase === 'deploying')}
              clockMs={bottomClock}
              clockRunning={bottomClockRunning}
            />
          </div>
        ) : null}
      </div>

      {/* Right panel — desktop: side panel, mobile: below board */}
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
                  opponentDeploySubmitted={opponentDeploySubmitted}
                  onCommit={handleCommitDeploy}
                  onUndo={handleCancelDeploy}
                />
              </>
            ) : (
              <DeployControls
                canCommit={false}
                deploySubmitted={true}
                opponentDeploySubmitted={opponentDeploySubmitted}
                onCommit={() => {}}
                onUndo={() => {}}
              />
            )}
          </div>
        ) : (
          <GameRightPanel
            moveHistory={moveHistory}
            phase={phase}
            myColor={myColor}
            pendingDrawOffer={pendingDrawOffer}
            pendingTakeback={pendingTakeback}
            onResign={resign}
            onOfferDraw={offerDraw}
            onAcceptDraw={acceptDraw}
            onDeclineDraw={declineDraw}
            onExpireDrawOffer={expireDrawOffer}
            onRequestTakeback={requestTakeback}
            onAcceptTakeback={acceptTakeback}
            onDeclineTakeback={declineTakeback}
            onExpireTakeback={expireTakeback}
          />
        )}
      </div>
    </div>
  );
}

function isAIPlayer(player: unknown): boolean {
  if (!player || typeof player !== 'object') return false;
  const record = player as Record<string, unknown>;
  return (
    record.is_ai === true ||
    record.player_type === 'ai' ||
    record.kind === 'ai' ||
    (typeof record.id === 'string' &&
      (record.id === 'ai' || record.id.startsWith('ai_') || record.id.startsWith('bot_')))
  );
}
