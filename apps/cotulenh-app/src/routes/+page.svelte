<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { CotulenhBoard, origMoveToKey } from '@repo/cotulenh-board';
  import type {
    Api,
    DestMove,
    OrigMove,
    OrigMoveKey,
    Role,
    SingleDeployMove,
    DeployStepMetadata
  } from '@repo/cotulenh-board';
  import { CoTuLenh, BLUE, RED } from '@repo/cotulenh-core';
  import type {
    Square,
    Color,
    StandardMove as Move,
    DeploySequence as DeployMoveRequest
  } from '@repo/cotulenh-core';
  import type { Key, Dests } from '@repo/cotulenh-board';
  import SidePanel from '$lib/components/SidePanel.svelte';
  import { gameStore } from '$lib/stores/game';

  import '@repo/cotulenh-board/assets/commander-chess.base.css';
  import '@repo/cotulenh-board/assets/commander-chess.pieces.css';
  import '$lib/styles/modern-warfare.css';
  import { makeCoreMove, typeToRole, roleToType, getMovesForSquare } from '$lib/utils';

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
    <div class="page-header">
      <div class="header-content">
        <h1>Strategic Command</h1>
        <p class="subtitle">Master the art of tactical warfare in CoTuLenh</p>
      </div>
    </div>

    <div class="game-layout">
      <div class="board-section">
        <div bind:this={boardContainerElement} class="board-container">
          {#if !boardApi}
            <div class="loading-state">
              <div class="loading-spinner"></div>
              <p>Initializing battlefield...</p>
            </div>
          {/if}
        </div>
      </div>

      <div class="controls-section">
        <SidePanel {game} onCommit={commitDeploy} onCancel={cancelDeploy} />
      </div>
    </div>
  </div>
</main>

<style>
  main {
    flex: 1;
    display: flex;
    flex-direction: column;
    /* Ensure background covers entire viewport height */
    min-height: 100vh;
    background-color: var(--mw-bg-dark);
    font-family: var(--font-ui);
    color: #e0e0e0;
  }

  .layout-container {
    max-width: 1800px;
    margin: 0 auto;
    padding: var(--spacing-xl);
    width: 100%;
    position: relative;
    z-index: 1;
  }

  /* Scanline overlay effect */
  .layout-container::before {
    content: '';
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background:
      linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%),
      linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06));
    background-size:
      100% 2px,
      3px 100%;
    pointer-events: none;
    z-index: 999;
    opacity: 0.6;
  }

  .page-header {
    margin-bottom: var(--spacing-xl);
    text-align: center;
    position: relative;
    border-bottom: 1px solid var(--mw-border-color);
    padding-bottom: var(--spacing-lg);
  }

  .header-content {
    display: inline-block;
    position: relative;
  }

  h1 {
    font-family: var(--font-display);
    font-size: clamp(2.5rem, 5vw, 5rem);
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin-bottom: var(--spacing-xs);
    color: var(--mw-primary);
    text-shadow: var(--mw-text-glow);
    position: relative;
    display: inline-block;
  }

  h1::after {
    /* Glitch/Underline effect */
    content: 'STRATEGIC COMMAND';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    opacity: 0.5;
    filter: blur(5px);
    z-index: -1;
  }

  .subtitle {
    font-family: var(--font-mono);
    font-size: 1rem;
    color: var(--mw-secondary);
    text-transform: uppercase;
    letter-spacing: 0.2em;
    margin: 0;
    margin-top: var(--spacing-sm);
    opacity: 0.8;
  }

  .game-layout {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 450px;
    gap: var(--spacing-xl);
    align-items: start;
  }

  .board-section {
    display: flex;
    justify-content: center;
    align-items: flex-start;
    padding: var(--spacing-md);
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid var(--mw-border-color);
    border-radius: 4px; /* Sharp corners */
    backdrop-filter: blur(5px);
  }

  .board-container {
    width: 100%;
    max-width: 900px;
    aspect-ratio: 12 / 13;
    position: relative;
    display: flex;
    justify-content: center;
    align-items: center;
    /* Transparent bg handled by cg-background */
    box-shadow: 0 0 50px rgba(0, 0, 0, 0.5);
    border-radius: 2px;
    border: 1px solid var(--mw-primary-dim);
    overflow: hidden;
  }

  /* Corner accents for board container */
  .board-section::before,
  .board-section::after {
    content: '';
    position: absolute;
    width: 20px;
    height: 20px;
    border: 2px solid var(--mw-primary);
    transition: all 0.3s ease;
  }
  .board-section::before {
    top: -2px;
    left: -2px;
    border-right: 0;
    border-bottom: 0;
  }
  .board-section::after {
    bottom: -2px;
    right: -2px;
    border-left: 0;
    border-top: 0;
  }

  .loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-md);
    color: var(--mw-primary);
    font-family: var(--font-mono);
  }

  .loading-spinner {
    width: 64px;
    height: 64px;
    border: 2px solid transparent;
    border-top-color: var(--mw-primary);
    border-right-color: var(--mw-secondary);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    box-shadow: 0 0 15px var(--mw-primary-dim);
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .controls-section {
    position: sticky;
    top: 20px;
    height: calc(100vh - 40px);
    /* SidePanel handles scrolling internally now */
  }

  .controls-grid {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-lg);
  }

  /* Responsive Design */
  @media (max-width: 1400px) {
    .game-layout {
      grid-template-columns: minmax(0, 1fr) 400px;
    }
  }

  @media (max-width: 1024px) {
    .game-layout {
      grid-template-columns: 1fr;
      gap: var(--spacing-xl);
    }

    .board-container {
      max-width: 100%;
    }

    .controls-section {
      position: static;
      max-height: none;
      padding-right: 0;
    }

    .controls-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: var(--spacing-lg);
    }
  }

  @media (max-width: 768px) {
    .layout-container {
      padding: var(--spacing-sm);
    }
    h1 {
      font-size: 2.5rem;
    }

    .board-section {
      padding: 0;
      border: none;
      background: transparent;
    }

    .controls-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
