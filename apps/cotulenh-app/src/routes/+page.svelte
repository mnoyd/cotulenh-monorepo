<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { CotulenhBoard, origMoveToKey } from '@repo/cotulenh-board';
  import type { Api, DestMove, OrigMove, OrigMoveKey, Role } from '@repo/cotulenh-board';
  import { CoTuLenh, BLUE, RED } from '@repo/cotulenh-core';
  import type { Square, Color, StandardMove as Move } from '@repo/cotulenh-core';
  import type { Key, Dests } from '@repo/cotulenh-board';
  import GameInfo from '$lib/components/GameInfo.svelte';
  import DeploySessionPanel from '$lib/components/DeploySessionPanel.svelte';
  import MoveHistory from '$lib/components/MoveHistory.svelte';

  import GameControls from '$lib/components/GameControls.svelte';
  import { gameStore } from '$lib/stores/game';

  import '@repo/cotulenh-board/assets/commander-chess.base.css';
  import '@repo/cotulenh-board/assets/commander-chess.pieces.css';
  import '$lib/styles/modern-warfare.css';
  import { makeCoreMove, typeToRole } from '$lib/utils';

  let boardContainerElement: HTMLElement | null = null;
  let boardApi = $state<Api | null>(null);
  let game = $state<CoTuLenh | null>(null);

  function coreToBoardColor(coreColor: Color | null): 'red' | 'blue' | undefined {
    return coreColor ? (coreColor === 'r' ? 'red' : 'blue') : undefined;
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
    const airDefense = game.getAirDefenseInfluence();
    return {
      red: airDefense[RED],
      blue: airDefense[BLUE]
    };
  }

  // handlePieceSelect removed (reverted to full load)

  function reSetupBoard(): Api | null {
    const perfStart = performance.now();
    if (boardApi) {
      const airDefenseStart = performance.now();
      const airDefense = coreToBoardAirDefense();
      const airDefenseEnd = performance.now();
      console.log(
        `⏱️ coreToBoardAirDefense took ${(airDefenseEnd - airDefenseStart).toFixed(2)}ms`
      );

      boardApi.set({
        fen: $gameStore.fen,
        turnColor: coreToBoardColor($gameStore.turn),
        lastMove: mapLastMoveToBoardFormat($gameStore.lastMove),
        check: coreToBoardCheck($gameStore.check, $gameStore.turn),
        airDefense: { influenceZone: airDefense },
        movable: {
          free: false,
          color: coreToBoardColor($gameStore.turn),
          dests: mapPossibleMovesToDests($gameStore.possibleMoves),
          events: {
            after: handleMove,
            session: {
              cancel: cancelDeploy,
              complete: commitDeploy
            }
          }
        }
      });
    }
    const perfEnd = performance.now();
    console.log(`⏱️ TOTAL reSetupBoard took ${(perfEnd - perfStart).toFixed(2)}ms`);
    return boardApi;
  }

  function mapPossibleMovesToDests(possibleMoves: Move[]): Dests {
    const perfStart = performance.now();
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
    const perfEnd = performance.now();
    console.log(
      `⏱️ mapPossibleMovesToDests took ${(perfEnd - perfStart).toFixed(2)}ms for ${possibleMoves.length} moves`
    );
    console.log('Mapped possible moves to dests:', dests);
    return dests;
  }

  function mapLastMoveToBoardFormat(lastMove: Square[] | undefined): Key[] | undefined {
    if (!lastMove) return undefined;
    return lastMove.map((square) => square);
  }

  function handleMove(orig: OrigMove, dest: DestMove) {
    const perfStart = performance.now();
    if (!game) {
      console.warn('handleMove called but game is null');
      return;
    }

    if (isUpdatingBoard) {
      console.warn('Move attempted while board is updating, ignoring');
      return;
    }

    console.log('Board move attempt:', orig, '->', dest);
    console.log('Game state at move time:', {
      turn: game.turn(),
      fen: game.fen(),
      hasDeploySession: !!game.getSession()
    });

    try {
      const moveStart = performance.now();
      const moveResult = makeCoreMove(game, orig, dest);
      const moveEnd = performance.now();
      console.log(`⏱️ makeCoreMove took ${(moveEnd - moveStart).toFixed(2)}ms`);
      console.log('Move result:', moveResult); // Log the result for diagnostic

      if (moveResult) {
        console.log('Game move successful:', moveResult);
        const storeStart = performance.now();
        gameStore.applyMove(game, moveResult);
        const storeEnd = performance.now();
        console.log(`⏱️ gameStore.applyMove took ${(storeEnd - storeStart).toFixed(2)}ms`);
      } else {
        console.warn('Illegal move attempted on board:', orig, '->', dest);
      }
    } catch (error) {
      console.error('Error making move in game engine:', error);
      console.log('Error details:', {
        message: (error as Error).message,
        stack: (error as Error).stack,
        gameState: {
          turn: game?.turn(),
          fen: game?.fen(),
          hasDeploySession: !!game?.getSession()
        }
      });
      reSetupBoard();
    }
    const perfEnd = performance.now();
    console.log(`⏱️ TOTAL handleMove took ${(perfEnd - perfStart).toFixed(2)}ms`);
  }

  /**
   * Manually commit the active deploy session
   *
   * Core commits the session and updates FEN (removes DEPLOY marker).
   * Get the SAN notation and add it to history.
   */
  function commitDeploy() {
    console.log('🏁 commitDeploy');

    if (!game) {
      console.error('❌ No game instance');
      return;
    }

    try {
      // Get SAN notation before commit
      const session = game.getSession();
      if (!session || !session.isDeploy) {
        console.error('❌ No deploy session active');
        return;
      }

      // Get the deploy move SAN by accessing the last history entry after commit

      // Get the deploy move SAN by accessing the last history entry after commit
      // const historyBefore = game.history();
      const result = game.commitSession();

      if (!result.success) {
        console.error('❌ Failed to commit:', result.reason);
        alert(`Cannot finish deployment: ${result.reason}`);
        return;
      }

      // Get the SAN from history (last entry added by commit)
      const historyAfter = game.history();
      const deployMoveSan = historyAfter[historyAfter.length - 1] || 'Deploy';

      console.log('✅ Deploy session committed');
      console.log('  Deploy SAN:', deployMoveSan);
      console.log('  FEN:', game.fen());
      console.log('  Turn:', game.turn());

      // Update game store with the deploy move SAN
      gameStore.applyDeployCommit(game, deployMoveSan);
    } catch (error) {
      console.error('❌ Failed to commit deploy session:', error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      alert(`Cannot finish deployment: ${errorMsg}`);
    }
  }

  /**
   * Cancel the active deploy session
   *
   * Core cancels the session and restores FEN to pre-deploy state.
   * Refresh the game store to reflect the restored state.
   */
  function cancelDeploy() {
    console.log('🚫 cancelDeploy');

    if (!game) return;

    try {
      game.cancelSession();
      console.log('✅ Deploy session cancelled');
      console.log('  FEN:', game.fen());
      console.log('  Turn:', game.turn());

      // Reinitialize game store with restored state
      gameStore.initialize(game);
    } catch (error) {
      console.error('❌ Failed to cancel deploy:', error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      alert(`Error cancelling deployment: ${errorMsg}`);
    }
  }

  onMount(() => {
    if (boardContainerElement) {
      console.log('Initializing game logic and board...');

      // Check for FEN in URL parameters
      const urlFen = $page.url.searchParams.get('fen');
      let initialFen: string | undefined = undefined;

      if (urlFen) {
        try {
          initialFen = decodeURIComponent(urlFen);
          console.log('Loading game with custom FEN:', initialFen);
        } catch (error) {
          console.error('Error decoding FEN from URL:', error);
        }
      }

      // Initialize game with custom FEN or default position
      game = initialFen ? new CoTuLenh(initialFen) : new CoTuLenh();
      gameStore.initialize(game);

      const unsubscribe = gameStore.subscribe((state) => {
        // console.log('Game state updated in store:', state);
      });

      boardApi = CotulenhBoard(boardContainerElement, {
        fen: $gameStore.fen,
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
              complete: commitDeploy
            }
          }
        }
      });

      return () => {
        console.log('Cleaning up board and game subscription.');
        boardApi?.destroy();
        unsubscribe();
      };
    }
  });

  let isUpdatingBoard = $state(false);
  let lastProcessedFen = '';

  $effect(() => {
    if (boardApi && $gameStore.fen && $gameStore.fen !== lastProcessedFen) {
      const reactiveStart = performance.now();
      console.log('🔄 Effect triggered by FEN change');
      lastProcessedFen = $gameStore.fen;
      isUpdatingBoard = true;
      reSetupBoard();
      // Use setTimeout to ensure the board update completes before allowing new moves
      setTimeout(() => {
        isUpdatingBoard = false;
        const reactiveEnd = performance.now();
        console.log(
          `⏱️ REACTIVE update completed in ${(reactiveEnd - reactiveStart).toFixed(2)}ms`
        );
      }, 0);
    }
  });
</script>

<main>
  <div class="layout-container">
    <div class="game-layout">
      <!-- Board Section -->
      <div class="board-section">
        <div bind:this={boardContainerElement} class="board-container">
          {#if !boardApi}
            <div class="loading-state">
              <div class="loading-spinner"></div>
            </div>
          {/if}
        </div>
      </div>

      <!-- Controls Section (Side Panel) -->
      <div class="controls-section">
        <header class="mw-header">
          <h1>WARFARE <span class="highlight">COMMAND</span></h1>
        </header>

        <div class="controls-grid">
          <GameInfo />
          <DeploySessionPanel {game} onCommit={commitDeploy} onCancel={cancelDeploy} />
          <GameControls {game} />
          <MoveHistory history={$gameStore.history} />
        </div>
      </div>
    </div>
  </div>
</main>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    background-color: #0a0a0a;
    color: #e5e5e5;
    font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  }

  main {
    min-height: 100vh;
    display: flex;
    justify-content: center;
    align-items: center;
    background-image:
      linear-gradient(rgba(0, 0, 0, 0.7), rgba(102, 177, 102, 0.71)), url('/assets/bg-warfare.jpg'); /* Hypothetical background */
    background-size: cover;
    background-position: center;
  }

  .layout-container {
    width: 100%;
    max-width: 1400px;
    padding: 20px;
  }

  .game-layout {
    display: flex;
    gap: 20px;
    align-items: stretch; /* Stretch to match heights */
    justify-content: center;
  }

  .board-section {
    flex: 0 0 auto;
    border: 1px solid #333;
    padding: 4px;
    background: rgba(20, 20, 20, 0.8);
    box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
    /* Ensure board section doesn't collapse horizontally */
    width: min(700px, 100%);
  }

  .board-container {
    width: 100%;
    /* Maintain board ratio */
    aspect-ratio: 700 / 758;
    position: relative;
    background: #111;
  }

  .loading-state {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    color: #059669;
  }

  .controls-section {
    width: 300px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    /* Ensure it takes full height of parent (which is stretched) */
    background: rgba(20, 20, 20, 0.5); /* Optional: add subtle bg to see full height if needed */
  }

  .mw-header {
    border-bottom: 2px solid #059669;
    padding-bottom: 8px;
    margin-bottom: 8px;
  }

  .mw-header h1 {
    font-size: 1.5rem;
    margin: 0;
    font-weight: 800;
    letter-spacing: 1px;
    color: #e5e5e5;
  }

  .mw-header .highlight {
    color: #059669;
  }

  .controls-grid {
    display: flex;
    flex-direction: column;
    gap: 12px;
    flex: 1; /* Fill the remaining height of controls-section */
  }

  /* Make the last item (MoveHistory) take up remaining space */
  .controls-grid > :global(:last-child) {
    flex: 1;
    min-height: 0; /* Crucial for scrolling inside flex items */
    overflow: hidden; /* Ensure it contains the scrollable history */
  }

  /* Responsive Design */
  @media (max-width: 1024px) {
    main {
      padding: 0;
      align-items: flex-start;
      height: 100vh;
      overflow: hidden; /* Prevent scrolling if we want a fixed app feel */
    }

    .layout-container {
      padding: 0;
      max-width: 100%;
      height: 100%;
    }

    .game-layout {
      flex-direction: column;
      gap: 0;
      height: 100%;
      align-items: stretch;
      justify-content: flex-start;
    }

    .board-section {
      flex: 1; /* Take remaining space */
      border: none;
      background: #000;
      box-shadow: none;
      padding: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }

    .board-container {
      width: 100%;
      height: auto;
      aspect-ratio: 700 / 758;
      max-height: 100%;
      /* Important: Center the board if max-height restricts it, though on typical mobile portrait width is the limiter */
      margin: 0 auto;
    }

    /* Target the cg-board element to ensure it scales correctly */
    :global(.board-container cg-board) {
      width: 100% !important;
      height: 100% !important;
      max-height: 100vh;
      max-width: 100vw;
    }

    .controls-section {
      width: 100%;
      flex: 0 0 auto; /* Fixed height based on content */
      background: rgba(20, 20, 20, 0.95);
      border-top: 2px solid #059669;
      padding: 10px;
      gap: 10px;
      z-index: 10;
    }

    .mw-header {
      display: none; /* Hide header on mobile to save space */
    }

    .controls-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }

    /* Explicitly target child components if possible or assume order */
    /* We can't target Svelte components by tag name easily in scoped CSS unless wrapped or global */
    /* Assuming Order: GameInfo, Deploy, GameControls, MoveHistory */

    /* Using nth-child is risky if order changes, but effective for now */
    .controls-grid > :global(:nth-child(1)) {
      /* GameInfo */
      grid-column: 1;
    }
    .controls-grid > :global(:nth-child(3)) {
      /* GameControls */
      grid-column: 2;
      /* Align GameControls height with GameInfo if needed */
    }
    .controls-grid > :global(:nth-child(2)) {
      /* DeploySessionPanel */
      grid-column: 1 / -1;
      order: 3; /* Move visual order below header row */
    }
    .controls-grid > :global(:nth-child(4)) {
      /* MoveHistory */
      grid-column: 1 / -1;
      order: 4;
      height: 120px; /* Shorten history on mobile */
    }
  }
</style>
