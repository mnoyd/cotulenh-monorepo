<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { page } from '$app/stores';
  import { browser } from '$app/environment';
  import { logger } from '@cotulenh/common';
  import { CotulenhBoard, origMoveToKey } from '@cotulenh/board';
  import type { Api, DestMove, OrigMove, OrigMoveKey, Role } from '@cotulenh/board';
  import { CoTuLenh, BLUE, RED } from '@cotulenh/core';
  import type {
    Square,
    Color,
    MoveResult as Move,
    RecombineOption,
    PieceSymbol
  } from '@cotulenh/core';
  import type { Key, Dests } from '@cotulenh/board';
  import GameInfo from '$lib/components/GameInfo.svelte';
  import DeploySessionPanel from '$lib/components/DeploySessionPanel.svelte';
  import MoveHistory from '$lib/components/MoveHistory.svelte';

  import GameControls from '$lib/components/GameControls.svelte';
  import { gameState, getDeployState } from '$lib/stores/game.svelte';

  import '$lib/styles/modern-warfare.css';
  import { makeCoreMove } from '$lib/utils';
  import { typeToRole, roleToType, coreColorToBoard } from '$lib/types/translations';
  import { toast } from 'svelte-sonner';

  let boardContainerElement: HTMLElement | null = null;
  let boardApi = $state<Api | null>(null);
  let game = $state<CoTuLenh | null>(null);
  let originalFen = $state<string | undefined>(undefined);

  // Use $derived to create reactive values from gameState
  let gameFen = $derived(gameState.fen);
  let gameTurn = $derived(gameState.turn);
  let gameStatus = $derived(gameState.status);
  let gameCheck = $derived(gameState.check);
  let gameLastMove = $derived(gameState.lastMove);
  let gamePossibleMoves = $derived(gameState.possibleMoves);

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

  // Reactive trigger for deploy state changes.
  // This counter is incremented when deploy session starts/ends to force uiDeployState to recompute.
  let deployVersion = $state(0);

  // uiDeployState depends on game state. Since game is a class instance,
  // we need to react to store updates (like FEN change) to re-evaluate it.
  // We also depend on deployVersion to trigger re-evaluation when deploy session changes.
  let uiDeployState = $derived.by(() => {
    // Read deployVersion to track it as a dependency
    void deployVersion;
    return gameFen ? getDeployState(game) : null;
  });

  function createBoardConfig() {
    return {
      fen: gameFen,
      viewOnly: gameStatus !== 'playing',
      turnColor: coreToBoardColor(gameTurn),
      lastMove: mapLastMoveToBoardFormat(gameLastMove),
      check: coreToBoardCheck(gameCheck, gameTurn),
      airDefense: { influenceZone: coreToBoardAirDefense() },
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
            ? uiDeployState.recombineOptions.map((opt: any) => ({
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
      // Cast 'from' and 'to' to Square (string) since we are mapping STANDARD moves for UI highlighting
      // Deploy/Complex moves might be handled differently or filtered out here if not relevant for basic picking
      const fromSq = move.from as Square;
      const toSq = (move.to instanceof Map ? undefined : move.to) as Square | undefined;

      if (!toSq) continue; // Skip complex moves for simple dest highlighting if needed

      const moveOrig: OrigMove = {
        square: fromSq,
        type: typeToRole(move.piece.type) as Role
      };
      const moveDest: DestMove = {
        square: toSq,
        stay: move.isStayCapture
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
      const viewIndex = gameState.historyViewIndex;
      const historyLength = gameState.history.length;
      if (viewIndex !== -1 && viewIndex < historyLength - 1) {
        // Calculate how many moves to undo
        // We want to keep (viewIndex + 1) moves.
        const targetLength = viewIndex + 1;
        const undoCount = historyLength - targetLength;

        if (undoCount > 0) {
          for (let i = 0; i < undoCount; i++) {
            game.undo();
          }
          // Sync the store with the rolled-back game state, including truncating history.
          gameState.handleUndo(game);
        }
      } else if (viewIndex === historyLength - 1) {
        // We are viewing the last move, which is effectively HEAD. Just cancel preview to be safe.
        gameState.cancelPreview(game);
      }

      const moveResult = makeCoreMove(game, orig, dest);

      if (moveResult) {
        // logger.debug('Game move successful:', moveResult);
        gameState.applyMove(game, moveResult);
        // Increment deployVersion to trigger uiDeployState recalculation
        deployVersion++;
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

      // 1. Force UI update immediately to remove the deploy panel
      deployVersion++;

      // 2. Use the result directly instead of querying history (which can cause replay issues)
      gameState.applyDeployCommit(game, result.result);
    } catch (error) {
      logger.error('❌ Failed to commit deploy session:', { error });
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Cannot finish deployment: ${errorMsg}`);
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

      const result = game.recombine(coreOption);

      if (result.completed) {
        // Recombine completed the session, add to history
        gameState.applyDeployCommit(game, result);
        deployVersion++; // Clear deploy state since session is complete
      } else {
        // Session still active, treat as a move update to refresh options and state
        gameState.applyMove(game, result);
        deployVersion++; // Update deploy state to refresh recombine options
      }
    } catch (error) {
      logger.error('Failed to recombine:', { error });
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Error executing recombine: ${errorMsg}`);
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
      gameState.initialize(game);
      // Clear deploy state
      deployVersion++;
    } catch (error) {
      logger.error('❌ Failed to cancel deploy:', { error });
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Error cancelling deployment: ${errorMsg}`);
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

      if (urlFen) {
        try {
          originalFen = decodeURIComponent(urlFen);
          logger.debug('Loading game with custom FEN:', { fen: originalFen });
        } catch (error) {
          logger.error(error, 'Error decoding FEN from URL:');
        }
      }

      // Initialize game with custom FEN or default position
      game = originalFen ? new CoTuLenh(originalFen) : new CoTuLenh();
      gameState.initialize(game);

      boardApi = CotulenhBoard(boardContainerElement, createBoardConfig());

      cleanup = () => {
        logger.debug('Cleaning up board and game subscription.');
        boardApi?.destroy();
      };
    })();

    // Add keyboard event listener
    window.addEventListener('keydown', handleKeydown);

    return () => {
      if (cleanup) cleanup();
      window.removeEventListener('keydown', handleKeydown);
    };
  });

  let cleanup: (() => void) | null = null;

  let isUpdatingBoard = $state(false);
  let lastProcessedFen = '';
  // Simple equality check might not work for complex objects, but references change on update
  let lastProcessedDeployState: any = null;

  $effect(() => {
    // Track dependencies
    void gameFen;
    void uiDeployState;

    // Check if FEN OR DeployState has changed
    const fenChanged = gameFen && gameFen !== lastProcessedFen;
    const deployStateChanged = uiDeployState !== lastProcessedDeployState;

    if (boardApi && (fenChanged || deployStateChanged)) {
      // console.log('🔄 Effect triggered', { fenChanged, deployStateChanged });
      lastProcessedFen = gameFen;
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

  function undoLastMove() {
    if (!game) return;
    game.undo();
    gameState.handleUndo(game);
    // If we undo while viewing history (not head), we are now at a new head
    // so logic inside handleUndo should take care of history truncation if implemented correctly
    // or we just rely on game state.
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

  // Keyboard shortcuts
  function handleKeydown(e: KeyboardEvent) {
    // Don't trigger if typing in an input
    if ((e.target as HTMLElement).tagName === 'INPUT') return;

    // Ignore if modifier keys are pressed
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
        // TODO: Implement redo
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
        }
        break;
      case 'ArrowLeft':
        e.preventDefault();
        gameState.previewMove(gameState.historyViewIndex - 1);
        break;
      case 'ArrowRight':
        e.preventDefault();
        gameState.previewMove(gameState.historyViewIndex + 1);
        break;
      case '?':
        e.preventDefault();
        // Could open shortcuts dialog here
        break;
    }
  }
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
            <DeploySessionPanel
              {game}
              deployState={uiDeployState}
              onCommit={commitDeploy}
              onCancel={cancelDeploy}
            />
          </div>
          <div class="max-lg:col-start-2">
            <GameControls bind:game {originalFen} />
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
