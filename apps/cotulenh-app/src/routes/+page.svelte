<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { CotulenhBoard, origMoveToKey } from '@repo/cotulenh-board';
  import type { Api, Role as BoardRole, DestMove, OrigMove, OrigMoveKey, Role, SingleDeployMove, DeployStepMetadata, MoveMetadata } from '@repo/cotulenh-board';
  import { CoTuLenh, BLUE, RED } from '@repo/cotulenh-core';
  import type { Square, Color, Move, DeployMoveRequest } from '@repo/cotulenh-core';
  import type { Key, Dests } from '@repo/cotulenh-board';
  import GameInfo from '$lib/components/GameInfo.svelte';
  import DeploySessionPanel from '$lib/components/DeploySessionPanel.svelte';
  import HeroicStatusPanel from '$lib/components/HeroicStatusPanel.svelte';
  import GameControls from '$lib/components/GameControls.svelte';
  import { gameStore } from '$lib/stores/game';

  import '@repo/cotulenh-board/assets/commander-chess.base.css';
  import '@repo/cotulenh-board/assets/commander-chess.pieces.css';
  import '@repo/cotulenh-board/assets/commander-chess.clasic.css';
    import { boardPieceToCore, convertSetMapToArrayMap, makeCoreMove, typeToRole, roleToType, getMovesForSquare } from '$lib/utils';

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
    if (!game) return {
      red: new Map(),
      blue: new Map()
    };
    const airDefense = game.getAirDefenseInfluence();
    return {
      red: airDefense[RED],
      blue: airDefense[BLUE]
    };
  }

  // ✅ LAZY LOADING: Generate moves for a specific square on-demand
  let currentDests = $state<Dests>(new Map());
  
  function loadMovesForSquare(square: Key): Dests {
    if (!game) return new Map();
    
    const perfStart = performance.now();
    const moves = getMovesForSquare(game, square);
    const dests = mapPossibleMovesToDests(moves);
    const perfEnd = performance.now();
    console.log(`⏱️ Lazy loaded ${moves.length} moves for ${square} in ${(perfEnd - perfStart).toFixed(2)}ms`);
    
    return dests;
  }
  
  function handlePieceSelect(orig: OrigMove) {
    if (!game) return;
    
    // Check if the selected square has a piece of the current player
    const piece = game.get(orig.square);
    const currentTurn = game.turn();
    
    // Only load moves if it's a piece belonging to the current player
    if (piece && piece.color === currentTurn) {
      // Generate moves only for the selected piece
      currentDests = loadMovesForSquare(orig.square);
      
      // Update board with new destinations
      if (boardApi) {
        boardApi.set({
          movable: {
            dests: currentDests
          }
        });
      }
    }
    // If clicking on enemy piece or empty square while a piece is selected,
    // keep the current dests (don't clear them)
  }

  function reSetupBoard():Api|null {
    const perfStart = performance.now();
    if (boardApi) {
        const airDefenseStart = performance.now();
        const airDefense = coreToBoardAirDefense();
        const airDefenseEnd = performance.now();
        console.log(`⏱️ coreToBoardAirDefense took ${(airDefenseEnd - airDefenseStart).toFixed(2)}ms`);
        
        // ✅ OPTIMIZATION: Don't pre-compute dests, they'll be loaded on piece selection
        console.log('⏱️ Skipping pre-computation of dests (lazy loading enabled)');
        
        // ✅ FIX: Preserve currentDests during board updates to avoid clearing during ambiguous moves
        const destsToUse = currentDests.size > 0 ? currentDests : new Map();
        
        boardApi.set({
          fen: $gameStore.fen,
          turnColor: coreToBoardColor($gameStore.turn),
          lastMove: mapLastMoveToBoardFormat($gameStore.lastMove),
          check: coreToBoardCheck($gameStore.check, $gameStore.turn),
          airDefense: {influenceZone: airDefense},
          movable: {
            free: false,
            color: coreToBoardColor($gameStore.turn),
            dests: destsToUse, // Use current dests if available, otherwise empty
            events: { 
              after: handleMove, 
              afterDeployStep: handleDeployStep
            }
          },
          events: {
            select: handlePieceSelect // ✅ NEW: Load moves when piece is selected
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
            type: typeToRole(move.piece.type) as Role,
        }
        const moveDest: DestMove = {
            square: move.to,
            stay: move.isStayCapture(),
        }
        const key = origMoveToKey(moveOrig);
        if (!dests.has(key)) {
            dests.set(key, []);
        }
        dests.get(key)!.push(moveDest);
    }
    const perfEnd = performance.now();
    console.log(`⏱️ mapPossibleMovesToDests took ${(perfEnd - perfStart).toFixed(2)}ms for ${possibleMoves.length} moves`);
    console.log('Mapped possible moves to dests:', dests);
    return dests;
  }

  function mapLastMoveToBoardFormat(
    lastMove: Square[] | undefined
  ): Key[] | undefined {
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
      hasDeploySession: !!game.getDeploySession()
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
        // Clear current dests after successful move
        currentDests = new Map();
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
          hasDeploySession: !!game?.getDeploySession()
        }
      });
      reSetupBoard();
    }
    const perfEnd = performance.now();
    console.log(`⏱️ TOTAL handleMove took ${(perfEnd - perfStart).toFixed(2)}ms`);
  }

  /**
   * Handle individual deploy step (incremental mode)
   * Fires immediately when user moves a piece during deployment
   * 
   * Board now derives deploy state from FEN automatically.
   * We just send the move to core and let reactive updates handle the rest.
   */
  function handleDeployStep(move: SingleDeployMove, metadata: DeployStepMetadata) {
    console.log('🎯 handleDeployStep:', move);
    
    if (!game) {
      console.error('❌ No game instance available');
      return;
    }

    if (isUpdatingBoard) {
      console.warn('Deploy step attempted while board is updating, ignoring');
      return;
    }

    try {
      // Convert board piece type to core piece type
      const coreType = roleToType(move.piece.role);
      
      // Send move to core - core will update DeploySession and FEN
      const result = game.move({
        from: move.from,
        to: move.to,
        piece: coreType,
        deploy: true
      });

      if (!result) {
        console.error('❌ Deploy move rejected by core');
        return;
      }

      console.log('✅ Deploy move accepted');
      console.log('  FEN:', game.fen());
      console.log('  Deploy session active:', !!game.getDeploySession());

      // Update game store with new FEN
      // The reactive statement ($: if (boardApi && $gameStore.fen)) will:
      // 1. Parse deploy state from FEN
      // 2. Update board highlights automatically
      // 3. Update valid moves
      gameStore.applyMove(game, result);
      
    } catch (error) {
      console.error('❌ Deploy step failed:', error);
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
    console.log('🏁 commitDeploy');
    
    if (!game) {
      console.error('❌ No game instance');
      return;
    }
    
    try {
      // Get SAN notation before commit
      const deploySession = game.getDeploySession();
      if (!deploySession) {
        console.error('❌ No deploy session active');
        return;
      }
      
      // Get the deploy move SAN by accessing the last history entry after commit
      // const historyBefore = game.history();
      const result = game.commitDeploySession();
      
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
      game.cancelDeploySession();
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
        airDefense: {influenceZone: coreToBoardAirDefense()},
        movable: {
          free: false,
          color: coreToBoardColor($gameStore.turn),
          dests: new Map(), // ✅ Empty - will be loaded on piece selection
          events: { after: handleMove, afterDeployStep: handleDeployStep }
        },
        events: {
          select: handlePieceSelect // ✅ NEW: Load moves when piece is selected
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
        console.log(`⏱️ REACTIVE update completed in ${(reactiveEnd - reactiveStart).toFixed(2)}ms`);
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
        <div class="controls-grid">
          <GameInfo />
          <DeploySessionPanel {game} onCommit={commitDeploy} onCancel={cancelDeploy} />
          <GameControls {game} />
          <HeroicStatusPanel {game} />
        </div>
      </div>
    </div>
  </div>
</main>

<style>
  main {
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  .layout-container {
    max-width: 1600px;
    margin: 0 auto;
    padding: var(--spacing-xl);
    width: 100%;
  }

  .page-header {
    margin-bottom: var(--spacing-xl);
    text-align: center;
  }

  .header-content {
    display: inline-block;
    position: relative;
  }

  h1 {
    font-size: clamp(2.5rem, 5vw, 4rem);
    font-weight: 800;
    letter-spacing: -0.03em;
    margin-bottom: var(--spacing-sm);
    background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 50%, var(--color-accent) 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    position: relative;
    display: inline-block;
  }

  h1::after {
    content: '';
    position: absolute;
    bottom: -8px;
    left: 50%;
    transform: translateX(-50%);
    width: 60%;
    height: 4px;
    background: linear-gradient(90deg, transparent, var(--color-primary), transparent);
    border-radius: 2px;
  }

  .subtitle {
    font-size: 1.1rem;
    color: var(--color-text-secondary);
    font-weight: 400;
    margin: 0;
    margin-top: var(--spacing-md);
  }

  .game-layout {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 420px;
    gap: var(--spacing-xl);
    align-items: start;
  }

  .board-section {
    display: flex;
    justify-content: center;
    align-items: flex-start;
  }

  .board-container {
    width: 100%;
    max-width: 800px;
    aspect-ratio: 12 / 13;
    position: relative;
    display: flex;
    justify-content: center;
    align-items: center;
    background: var(--color-surface);
    box-shadow: var(--shadow-xl);
    border-radius: var(--radius-xl);
    border: 1px solid var(--color-border);
    overflow: hidden;
    transition: transform var(--transition-slow), box-shadow var(--transition-slow);
  }

  .board-container:hover {
    transform: translateY(-2px);
    box-shadow: 0 24px 38px -8px rgba(0, 0, 0, 0.5), 0 12px 16px -8px rgba(0, 0, 0, 0.4);
  }

  .loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-md);
    color: var(--color-text-secondary);
  }

  .loading-spinner {
    width: 48px;
    height: 48px;
    border: 4px solid var(--color-border);
    border-top-color: var(--color-primary);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .loading-state p {
    margin: 0;
    font-size: 0.95rem;
    font-weight: 500;
  }

  .controls-section {
    position: sticky;
    top: calc(70px + var(--spacing-lg));
    max-height: calc(100vh - 70px - var(--spacing-xl) * 2);
    overflow-y: auto;
    padding-right: var(--spacing-xs);
  }

  .controls-section::-webkit-scrollbar {
    width: 6px;
  }
  
  .controls-section::-webkit-scrollbar-track {
    background: transparent;
  }
  
  .controls-section::-webkit-scrollbar-thumb {
    background: var(--color-border);
    border-radius: 3px;
  }
  
  .controls-section::-webkit-scrollbar-thumb:hover {
    background: var(--color-border-light);
  }

  .controls-grid {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-lg);
  }

  /* Responsive Design */
  @media (max-width: 1400px) {
    .game-layout {
      grid-template-columns: minmax(0, 1fr) 380px;
      gap: var(--spacing-lg);
    }
  }

  @media (max-width: 1200px) {
    .layout-container {
      padding: var(--spacing-lg);
    }

    .game-layout {
      grid-template-columns: minmax(0, 1fr) 340px;
    }

    .board-container {
      max-width: 700px;
    }
  }

  @media (max-width: 1024px) {
    .game-layout {
      grid-template-columns: 1fr;
      gap: var(--spacing-xl);
    }

    .board-container {
      max-width: 650px;
    }

    .controls-section {
      position: static;
      max-height: none;
      padding-right: 0;
    }

    .controls-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: var(--spacing-lg);
    }
  }
  
  @media (max-width: 768px) {
    .layout-container {
      padding: var(--spacing-md);
    }

    .page-header {
      margin-bottom: var(--spacing-lg);
    }
    
    h1 {
      font-size: 2rem;
    }

    .subtitle {
      font-size: 1rem;
    }

    .game-layout {
      gap: var(--spacing-lg);
    }
    
    .board-container {
      max-width: 100%;
      border-radius: var(--radius-lg);
    }

    .controls-grid {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 480px) {
    .layout-container {
      padding: var(--spacing-sm);
    }

    h1 {
      font-size: 1.75rem;
    }

    .subtitle {
      font-size: 0.9rem;
    }
  }
</style>
