<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { page } from '$app/stores';
  import { browser } from '$app/environment';
  import { logger } from '@cotulenh/common';
  import { CotulenhBoard, origMoveToKey } from '@cotulenh/board';
  import type { Api, DestMove, OrigMove, OrigMoveKey, Role } from '@cotulenh/board';
  import { CoTuLenh, BLUE, RED, executeRecombine } from '@cotulenh/core';
  import type {
    Square,
    Color,
    StandardMove as Move,
    RecombineOption,
    PieceSymbol
  } from '@cotulenh/core';
  import type { Key, Dests } from '@cotulenh/board';
  import GameInfo from '$lib/components/GameInfo.svelte';
  import DeploySessionPanel from '$lib/components/DeploySessionPanel.svelte';
  import MoveHistory from '$lib/components/MoveHistory.svelte';

  import GameControls from '$lib/components/GameControls.svelte';
  import { gameStore, getDeployState } from '$lib/stores/game';

  import '$lib/styles/modern-warfare.css';
  import { makeCoreMove } from '$lib/utils';
  import { typeToRole, roleToType, coreColorToBoard } from '$lib/types/translations';

  let boardContainerElement: HTMLElement | null = null;
  let boardApi = $state<Api | null>(null);
  let game = $state<CoTuLenh | null>(null);

  function coreToBoardColor(coreColor: Color | null): 'red' | 'blue' | undefined {
    return coreColor ? coreColorToBoard(coreColor) : undefined;
  }

  function coreToBoardCheck(check: boolean, coreColor: Color | null): 'red' | 'blue' | undefined {
    return check ? coreToBoardColor(coreColor) : undefined;
  }
  function coreToBoardAirDefense(): {
    red: Map<Key, Key[]>;
    blue: Map<Key, Key[]>;
  } {
    if (!game)
      return {
        red: new Map(),
        blue: new Map()
      };

    // Optimize: Only calculate if needed or if game state changed significantly
    // But since this is called during reSetupBoard which is triggered by FEN change,
    // it's already scoped.
    const airDefense = game.getAirDefenseInfluence();
    return {
      red: airDefense[RED],
      blue: airDefense[BLUE]
    };
  }

  // handlePieceSelect removed (reverted to full load)

  // uiDeployState depends on game state. Since game is a class instance,
  // we need to react to store updates (like FEN change) to re-evaluate it.
  let uiDeployState = $derived($gameStore.fen ? getDeployState(game) : null);

  function createBoardConfig() {
    return {
      fen: $gameStore.fen,
      viewOnly: $gameStore.status !== 'playing',
      turnColor: coreToBoardColor($gameStore.turn),
      lastMove: mapLastMoveToBoardFormat($gameStore.lastMove),
      check: coreToBoardCheck($gameStore.check, $gameStore.turn),
      airDefense: { influenceZone: coreToBoardAirDefense() },
      movable: {
        free: false,
        color: coreToBoardColor($gameStore.turn),
        dests: mapPossibleMovesToDests($gameStore.possibleMoves),
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
            ? uiDeployState.recombineOptions.map((opt) => ({
                square: opt.square,
                piece: typeToRole(opt.piece as unknown as PieceSymbol) as Role
              }))
            : undefined
        }
      }
    } as any;
  }

  function reSetupBoard(): Api | null {
    if (boardApi) {
      boardApi.set(createBoardConfig());
    }
    return boardApi;
  }

  function mapPossibleMovesToDests(possibleMoves: Move[]): Dests {
    // Optimization: This functional approach is fine, but we could avoid recreating objects if performance was critical.
    // Given the number of moves (usually < 100), this is negligible.
    // Removed logging for performance.
    const dests = new Map<OrigMoveKey, DestMove[]>();

    for (const move of possibleMoves) {
      const moveOrig: OrigMove = {
        square: move.from,
        type: typeToRole(move.piece.type) as Role
      };
      const moveDest: DestMove = {
        square: move.to,
        stay: move.isStayCapture()
      };
      const key = origMoveToKey(moveOrig);
      if (!dests.has(key)) {
        dests.set(key, []);
      }
      dests.get(key)!.push(moveDest);
    }
    return dests;
  }

  function mapLastMoveToBoardFormat(lastMove: Square[] | undefined): Key[] | undefined {
    if (!lastMove) return undefined;
    return lastMove.map((square) => square);
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
      // Check if we are viewing history. If so, and we make a move, we need to rollback to that state
      // effectively truncating the future history.
      const viewIndex = $gameStore.historyViewIndex;
      if (viewIndex !== -1 && viewIndex < $gameStore.history.length - 1) {
        // Calculate how many moves to undo
        // We want to keep (viewIndex + 1) moves.
        // Current length is gameStore.history.length (which should match game.history().length if sync)
        const targetLength = viewIndex + 1;
        const currentLength = $gameStore.history.length;
        const undoCount = currentLength - targetLength;

        if (undoCount > 0) {
          for (let i = 0; i < undoCount; i++) {
            game.undo();
          }
          // Sync the store with the rolled-back game state, including truncating history.
          gameStore.handleUndo(game);
        }
      } else if (viewIndex === $gameStore.history.length - 1) {
        // We are viewing the last move, which is effectively HEAD. Just cancel preview to be safe.
        gameStore.cancelPreview(game);
      }

      const moveResult = makeCoreMove(game, orig, dest);

      if (moveResult) {
        // logger.debug('Game move successful:', moveResult);
        gameStore.applyMove(game, moveResult);
      } else {
        logger.warn('Illegal move attempted on board', { orig, dest });
      }
    } catch (error) {
      logger.error('Error making move in game engine:', { error });
      reSetupBoard();
    }
  }

  /**
   * Manually commit the active deploy session
   *
   * Core commits the session and updates FEN (removes DEPLOY marker).
   * Get the SAN notation and add it to history.
   */
  function commitDeploy() {
    if (!game) {
      logger.error('❌ No game instance');
      return;
    }

    try {
      // Get SAN notation before commit
      const session = game.getSession();
      if (!session || !session.isDeploy) {
        logger.error('❌ No deploy session active');
        return;
      }

      const result = game.commitSession();

      if (!result.success) {
        logger.error('❌ Failed to commit:', result.reason);
        alert(`Cannot finish deployment: ${result.reason}`);
        return;
      }

      // Get the SAN from history (last entry added by commit)
      const historyAfter = game.history({ verbose: true });
      const deployMove = historyAfter[historyAfter.length - 1];

      if (!deployMove) {
        logger.error('❌ No move found in history after commit');
        return;
      }

      // Update game store with the deploy move SAN
      gameStore.applyDeployCommit(game, deployMove);
    } catch (error) {
      logger.error('❌ Failed to commit deploy session:', { error });
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      alert(`Cannot finish deployment: ${errorMsg}`);
    }
  }

  /**
   * Handle recombine action from the board
   * @param option The recombine option object passed from the board
   */
  function handleRecombine(option: RecombineOption) {
    if (!game) return;

    try {
      const session = game.getSession();
      if (!session || !session.isDeploy) {
        return;
      }

      // Convert board Role (e.g. 'tank') to core PieceSymbol (e.g. 't')
      const coreOption: RecombineOption = {
        square: option.square,
        piece: roleToType(option.piece as unknown as Role)
      };

      const result = executeRecombine(game, coreOption);

      if (result.completed) {
        // Recombine completed the session, add to history
        gameStore.applyDeployCommit(game, result);
      } else {
        // Session still active, treat as a move update to refresh options and state
        gameStore.applyMove(game, result);
      }
    } catch (error) {
      logger.error('Failed to recombine:', { error });
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      alert(`Error executing recombine: ${errorMsg}`);
    }
  }

  /**
   * Cancel the active deploy session
   *
   * Core cancels the session and restores FEN to pre-deploy state.
   * Refresh the game store to reflect the restored state.
   */
  function cancelDeploy() {
    if (!game) return;

    try {
      game.cancelSession();
      // Reinitialize game store with restored state
      gameStore.initialize(game);
    } catch (error) {
      logger.error('❌ Failed to cancel deploy:', { error });
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      alert(`Error cancelling deployment: ${errorMsg}`);
    }
  }

  onMount(() => {
    (async () => {
      if (!boardContainerElement) return;

      // Load CSS before initializing board to prevent 0-size layout issues
      if (browser) {
        await Promise.all([
          import('@cotulenh/board/assets/commander-chess.base.css'),
          import('@cotulenh/board/assets/commander-chess.pieces.css')
        ]);
      }

      logger.debug('Initializing game logic and board...');

      // Check for FEN in URL parameters
      const urlFen = $page.url.searchParams.get('fen');
      let initialFen: string | undefined = undefined;

      if (urlFen) {
        try {
          initialFen = decodeURIComponent(urlFen);
          logger.debug('Loading game with custom FEN:', { fen: initialFen });
        } catch (error) {
          logger.error(error, 'Error decoding FEN from URL:');
        }
      }

      // Initialize game with custom FEN or default position
      game = initialFen ? new CoTuLenh(initialFen) : new CoTuLenh();
      gameStore.initialize(game);

      const unsubscribe = gameStore.subscribe((state) => {
        // logger.debug('Game state updated in store:', state);
      });

      boardApi = CotulenhBoard(boardContainerElement, createBoardConfig());

      cleanup = () => {
        logger.debug('Cleaning up board and game subscription.');
        boardApi?.destroy();
        unsubscribe();
      };
    })();

    return () => {
      if (cleanup) cleanup();
    };
  });

  let cleanup: (() => void) | null = null;

  let isUpdatingBoard = $state(false);
  let lastProcessedFen = '';
  // Simple equality check might not work for complex objects, but references change on update
  let lastProcessedDeployState: any = null;

  $effect(() => {
    // Check if FEN OR DeployState has changed
    const fenChanged = $gameStore.fen && $gameStore.fen !== lastProcessedFen;
    const deployStateChanged = uiDeployState !== lastProcessedDeployState;

    if (boardApi && (fenChanged || deployStateChanged)) {
      // console.log('🔄 Effect triggered', { fenChanged, deployStateChanged });
      lastProcessedFen = $gameStore.fen;
      lastProcessedDeployState = uiDeployState;
      isUpdatingBoard = true;
      reSetupBoard();

      // Use tick() to wait for DOM updates if needed, though setTimeout is effectively yielding to next tick
      // Removing explicit lag.
      tick().then(() => {
        isUpdatingBoard = false;
      });
    }
  });
</script>

<main
  class="min-h-screen flex justify-center items-center bg-black bg-center bg-fixed text-[#e5e5e5] font-ui max-lg:p-0 max-lg:items-start max-lg:h-screen max-lg:overflow-hidden"
  style="background-image: linear-gradient(rgba(0,0,0,0.7), rgba(0,0,0,0.8)), url('/assets/bg-warfare.jpg'); background-size: cover;"
>
  <div class="w-full max-w-[1600px] p-6 max-lg:p-0 max-lg:max-w-full max-lg:h-full">
    <div
      class="flex gap-6 items-stretch justify-center max-lg:flex-col max-lg:gap-0 max-lg:h-full max-lg:justify-start"
    >
      <!-- Board Section -->
      <div
        class="flex-none border border-mw-border p-1 bg-mw-bg-panel shadow-2xl rounded-sm w-[min(760px,100%)] max-lg:flex-1 max-lg:border-none max-lg:bg-black max-lg:shadow-none max-lg:p-0 max-lg:flex max-lg:items-center max-lg:justify-center max-lg:overflow-hidden"
      >
        <div
          bind:this={boardContainerElement}
          class="w-full aspect-[11/12] relative bg-[#111] max-lg:h-auto max-lg:max-h-full max-lg:aspect-[11/12] max-lg:m-auto [&_cg-board]:!w-full [&_cg-board]:!h-full [&_cg-board]:max-h-screen [&_cg-board]:max-w-[100vw]"
        >
          {#if !boardApi}
            <div
              class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-mw-secondary"
            >
              <div class="loading-spinner"></div>
            </div>
          {/if}
        </div>
      </div>

      <!-- Controls Section (Side Panel) -->
      <div
        class="w-[340px] flex flex-col gap-4 bg-mw-bg-panel border border-mw-border backdrop-blur-md rounded-sm p-4 max-lg:w-full max-lg:flex-none max-lg:bg-black/95 max-lg:border-t-2 max-lg:border-mw-secondary max-lg:p-3 max-lg:gap-3 max-lg:z-10"
      >
        <header class="border-b border-mw-border pb-3 mb-2 max-lg:hidden">
          <h1
            class="text-2xl m-0 font-extrabold tracking-wide text-white font-display uppercase flex items-center gap-2"
          >
            <span class="text-mw-secondary">Cotulenh</span>
            <span class="text-mw-primary font-light">Online</span>
          </h1>
        </header>

        <div class="flex flex-col gap-4 flex-1 max-lg:grid max-lg:grid-cols-2 max-lg:gap-2">
          <div class="max-lg:col-start-1">
            <GameInfo />
          </div>
          <div class="max-lg:col-span-full max-lg:order-3">
            <DeploySessionPanel {game} onCommit={commitDeploy} onCancel={cancelDeploy} />
          </div>
          <div class="max-lg:col-start-2">
            <GameControls bind:game />
          </div>
          <div
            class="flex-1 min-h-0 overflow-hidden max-lg:col-span-full max-lg:order-4 max-lg:h-[120px]"
          >
            <MoveHistory />
          </div>
        </div>
      </div>
    </div>
  </div>
</main>
