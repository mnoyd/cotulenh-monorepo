import { tick } from 'svelte';
import { logger } from '@cotulenh/common';
import type { Api, Config, DestMove, OrigMove } from '@cotulenh/board';
import { CoTuLenh } from '@cotulenh/core';
import type { RecombineOption as CoreRecombineOption, RecombineResult } from '@cotulenh/core';
import type { RecombineOption as BoardRecombineOption } from '@cotulenh/board';
import { gameState, getDeployState } from '$lib/stores/game.svelte';
import { makeCoreMove } from '$lib/utils';
import { safeSymbolToRole, safeRoleToSymbol } from '$lib/types/type-guards';
import { toast } from 'svelte-sonner';
import {
  coreToBoardColor,
  coreToBoardCheck,
  coreToBoardAirDefense,
  mapPossibleMovesToDests,
  mapLastMoveToBoardFormat
} from './utils.js';

export function createGameController() {
  let boardApi = $state<Api | null>(null);
  let game = $state<CoTuLenh | null>(null);
  let originalFen = $state<string | undefined>(undefined);
  let isUpdatingBoard = $state(false);
  let lastProcessedFen = '';
  let lastProcessedDeployVersion = 0;
  let lastProcessedViewIndex = -1;

  const gameFen = $derived(gameState.fen);
  const gameTurn = $derived(gameState.turn);
  const gameStatus = $derived(gameState.status);
  const gameCheck = $derived(gameState.check);
  const gameLastMove = $derived(gameState.lastMove);
  const gamePossibleMoves = $derived(gameState.possibleMoves);
  const historyViewIndex = $derived(gameState.historyViewIndex);
  const deployVersion = $derived(gameState.deployVersion);

  const uiDeployState = $derived.by(() => {
    void deployVersion;
    return gameFen ? getDeployState(game) : null;
  });

  function createBoardConfig() {
    return {
      fen: gameFen,
      viewOnly: gameStatus !== 'playing' || historyViewIndex !== -1,
      turnColor: coreToBoardColor(gameTurn),
      lastMove: mapLastMoveToBoardFormat(gameLastMove),
      check: coreToBoardCheck(gameCheck, gameTurn),
      airDefense: { influenceZone: coreToBoardAirDefense(game) },
      movable: {
        free: false,
        color: coreToBoardColor(gameTurn),
        dests: mapPossibleMovesToDests(gamePossibleMoves),
        events: {
          after: handleMove,
          session: {
            cancel: cancelDeploy,
            complete: commitDeploy,
            recombine: handleRecombine
          }
        },
        session: {
          options: uiDeployState?.recombineOptions
            ? uiDeployState.recombineOptions.map((opt: CoreRecombineOption) => ({
                square: opt.square,
                piece: safeSymbolToRole(opt.piece)
              }))
            : undefined
        }
      }
    } as unknown as Config;
  }

  function reSetupBoard(): Api | null {
    if (boardApi) {
      const config = createBoardConfig();
      // Don't include fen if unchanged - avoids triggering unnecessary animation cycle
      if (config.fen === lastProcessedFen) {
        delete (config as { fen?: string }).fen;
      }
      boardApi.set(config);
    }
    return boardApi;
  }

  function handleMove(orig: OrigMove, dest: DestMove) {
    if (!game) {
      logger.warn('handleMove called but game is null');
      return;
    }

    if (isUpdatingBoard) {
      logger.warn('Move attempted while board is updating, ignoring');
      return;
    }

    try {
      const viewIndex = gameState.historyViewIndex;
      const historyLength = gameState.history.length;
      if (viewIndex !== -1 && viewIndex < historyLength - 1) {
        const targetLength = viewIndex + 1;
        const undoCount = historyLength - targetLength;

        if (undoCount > 0) {
          for (let i = 0; i < undoCount; i++) {
            game.undo();
          }
          gameState.handleUndo(game);
        }
      } else if (viewIndex === historyLength - 1) {
        gameState.cancelPreview(game);
      }

      const moveResult = makeCoreMove(game, orig, dest);

      if (moveResult) {
        gameState.applyMove(game, moveResult);
        gameState.incrementDeployVersion();
      } else {
        logger.warn('Illegal move attempted on board', { orig, dest });
      }
    } catch (error) {
      logger.error('Error making move in game engine:', { error });
      reSetupBoard();
    }
  }

  function commitDeploy() {
    if (!game) {
      logger.error('❌ No game instance');
      return;
    }

    try {
      const session = game.getSession();
      if (!session || !session.isDeploy) {
        logger.error('❌ No deploy session active');
        return;
      }

      const result = game.commitSession();

      if (!result.success || !result.result) {
        const reason = result.reason || 'Unknown error';
        logger.error('❌ Failed to commit:', reason);
        toast.error(`Cannot finish deployment: ${reason}`);
        return;
      }

      gameState.incrementDeployVersion();
      gameState.applyDeployCommit(game, result.result);
    } catch (error) {
      logger.error('❌ Failed to commit deploy session:', { error });
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Cannot finish deployment: ${errorMsg}`);
    }
  }

  function handleRecombine(option: BoardRecombineOption) {
    if (!game) return;

    try {
      const session = game.getSession();
      if (!session || !session.isDeploy) {
        return;
      }

      const coreOption: CoreRecombineOption = {
        square: option.square,
        piece: safeRoleToSymbol(option.piece)
      };

      const recombineResult = game.recombine(coreOption);

      // Type assertion is safe here because recombine returns an object with success/result
      if (
        (recombineResult as RecombineResult).success &&
        (recombineResult as RecombineResult).result
      ) {
        const result = (recombineResult as RecombineResult).result!;
        if (result.completed) {
          gameState.applyDeployCommit(game, result);
        } else {
          gameState.applyMove(game, result);
        }
        gameState.incrementDeployVersion();
      }
    } catch (error) {
      logger.error('Failed to recombine:', { error });
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Error executing recombine: ${errorMsg}`);
    }
  }

  function cancelDeploy() {
    if (!game) return;

    try {
      game.cancelSession();
      gameState.initialize(game);
      gameState.incrementDeployVersion();
    } catch (error) {
      logger.error('❌ Failed to cancel deploy:', { error });
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Error cancelling deployment: ${errorMsg}`);
    }
  }

  function handleBoardReady(api: Api) {
    boardApi = api;
    logger.debug('Board API ready');
  }

  function initializeGame(urlFen: string | null) {
    logger.debug('Initializing game logic...');

    if (urlFen) {
      try {
        originalFen = decodeURIComponent(urlFen);
        logger.debug('Loading game with custom FEN:', { fen: originalFen });
      } catch (error) {
        logger.error(error, 'Error decoding FEN from URL:');
      }
    }

    game = originalFen ? new CoTuLenh(originalFen) : new CoTuLenh();
    gameState.initialize(game);
  }

  function undoLastMove() {
    if (!game) return;
    game.undo();
    gameState.handleUndo(game);
    toast.info('Undo successful');
  }

  function resetGame() {
    if (!game) return;
    if (confirm('Are you sure you want to reset the game?')) {
      game = originalFen ? new CoTuLenh(originalFen) : new CoTuLenh();
      gameState.initialize(game);
      toast.success('Game reset');
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if ((e.target as HTMLElement).tagName === 'INPUT') return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;

    switch (e.key) {
      case 'z':
      case 'Z':
        e.preventDefault();
        if (game && game.history().length > 0) {
          undoLastMove();
        }
        break;
      case 'y':
      case 'Y':
        e.preventDefault();
        toast.info('Redo coming soon');
        break;
      case 'r':
      case 'R':
        e.preventDefault();
        resetGame();
        break;
      case 'Escape':
        e.preventDefault();
        if (game && game.getSession()) {
          cancelDeploy();
        } else if (game && gameState.historyViewIndex !== -1) {
          gameState.cancelPreview(game);
        }
        break;
      case 'ArrowLeft':
        e.preventDefault();
        gameState.previewMove(gameState.historyViewIndex - 1);
        break;
      case 'ArrowRight':
        e.preventDefault();
        {
          const nextIndex = gameState.historyViewIndex + 1;
          if (gameState.historyViewIndex === -1) {
            // Already at live, do nothing
          } else if (nextIndex >= gameState.history.length) {
            if (game) gameState.cancelPreview(game);
          } else {
            gameState.previewMove(nextIndex);
          }
        }
        break;
      case '?':
        e.preventDefault();
        break;
    }
  }

  function setupBoardEffect() {
    void gameFen;
    void deployVersion;
    void historyViewIndex;

    const fenChanged = gameFen && gameFen !== lastProcessedFen;
    const deployVersionChanged = deployVersion !== lastProcessedDeployVersion;
    const viewModeChanged = (historyViewIndex !== -1) !== (lastProcessedViewIndex !== -1);

    if (boardApi && (fenChanged || deployVersionChanged || viewModeChanged)) {
      lastProcessedFen = gameFen;
      lastProcessedDeployVersion = deployVersion;
      lastProcessedViewIndex = historyViewIndex;
      isUpdatingBoard = true;
      reSetupBoard();

      tick().then(() => {
        isUpdatingBoard = false;
      });
    }
  }

  return {
    get game() {
      return game;
    },
    set game(v) {
      game = v;
    },
    get boardApi() {
      return boardApi;
    },
    get originalFen() {
      return originalFen;
    },
    get uiDeployState() {
      return uiDeployState;
    },
    get gameFen() {
      return gameFen;
    },
    get historyViewIndex() {
      return historyViewIndex;
    },

    createBoardConfig,
    handleBoardReady,
    initializeGame,
    handleKeydown,
    commitDeploy,
    cancelDeploy,
    setupBoardEffect
  };
}

export type GameController = ReturnType<typeof createGameController>;
