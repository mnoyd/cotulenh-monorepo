<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { CotulenhBoard, origMoveToKey } from '@repo/cotulenh-board';
  import type { Api, Role as BoardRole, DestMove, OrigMove, OrigMoveKey, Role, SingleDeployMove, DeployStepMetadata, MoveMetadata } from '@repo/cotulenh-board';
  import { CoTuLenh, BLUE, RED } from '@repo/cotulenh-core';
  import type { Square, Color, Move, DeployMoveRequest } from '@repo/cotulenh-core';
  import type { Key, Dests } from '@repo/cotulenh-board';
  import GameInfo from '$lib/components/GameInfo.svelte';
  import DeployControls from '$lib/components/DeployControls.svelte';
  import CombinationPanel from '$lib/components/CombinationPanel.svelte';
  import HeroicStatusPanel from '$lib/components/HeroicStatusPanel.svelte';
  import GameControls from '$lib/components/GameControls.svelte';
  import { gameStore } from '$lib/stores/game';

  import '@repo/cotulenh-board/assets/commander-chess.base.css';
  import '@repo/cotulenh-board/assets/commander-chess.pieces.css';
  import '@repo/cotulenh-board/assets/commander-chess.clasic.css';
    import { boardPieceToCore, convertSetMapToArrayMap, makeCoreMove, typeToRole, roleToType } from '$lib/utils';

  let boardContainerElement: HTMLElement | null = null;
  let boardApi: Api | null = null;
  let game: CoTuLenh | null = null;

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

  function reSetupBoard():Api|null {
    const perfStart = performance.now();
    if (boardApi) {
        const airDefenseStart = performance.now();
        const airDefense = coreToBoardAirDefense();
        const airDefenseEnd = performance.now();
        console.log(`⏱️ coreToBoardAirDefense took ${(airDefenseEnd - airDefenseStart).toFixed(2)}ms`);
        
        const destsStart = performance.now();
        const dests = mapPossibleMovesToDests($gameStore.possibleMoves);
        const destsEnd = performance.now();
        console.log(`⏱️ mapPossibleMovesToDests in reSetupBoard took ${(destsEnd - destsStart).toFixed(2)}ms`);
        
        boardApi.set({
          fen: $gameStore.fen,
          turnColor: coreToBoardColor($gameStore.turn),
          lastMove: mapLastMoveToBoardFormat($gameStore.lastMove),
          check: coreToBoardCheck($gameStore.check, $gameStore.turn),
          airDefense: {influenceZone: airDefense},
          movable: {
            free: false,
            color: coreToBoardColor($gameStore.turn),
            dests: dests,
            events: { after: handleMove, afterDeployStep: handleDeployStep }
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
        const pieceAtSquare = game?.get(move.from);
        if (!pieceAtSquare) continue;

        // For deploy moves: map all pieces in stack (each can move independently)
        // For normal stack moves: only map the carrier piece (whole stack moves together)
        const piecesToMap: typeof pieceAtSquare[] = [];
        
        if (move.isDeploy()) {
            // Deploy mode: all pieces in stack can move
            piecesToMap.push(pieceAtSquare);
            if (pieceAtSquare.carrying) {
                piecesToMap.push(...pieceAtSquare.carrying);
            }
        } else {
            // Normal mode: only the carrier piece (the piece that actually moved)
            piecesToMap.push(move.piece);
        }

        for (const piece of piecesToMap) {
            const moveOrig: OrigMove = {
                square: move.from,
                type: typeToRole(piece.type) as Role,
            }
            const moveDest: DestMove = {
                square: move.to,
                stay: move.isStayCapture(),
            }
            const key = origMoveToKey(moveOrig);
            if (!dests.has(key)) {
                dests.set(key, []);
            }
            // Avoid duplicate destinations
            const existingDests = dests.get(key)!;
            if (!existingDests.some(d => d.square === moveDest.square && d.stay === moveDest.stay)) {
                existingDests.push(moveDest);
            }
        }
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
   * Reactive update will handle board state automatically.
   */
  function commitDeploy() {
    console.log('🏁 commitDeploy');
    
    if (!game) {
      console.error('❌ No game instance');
      return;
    }
    
    try {
      game.commitDeploySession();
      console.log('✅ Deploy session committed');
      console.log('  FEN:', game.fen());
      console.log('  Turn:', game.turn());
      
      // Update game store with new FEN (without DEPLOY marker)
      // Reactive statement will update board automatically
      gameStore.initialize(game);
      
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
   * Reactive update will handle board state automatically.
   */
  function cancelDeploy() {
    console.log('🚫 cancelDeploy');
    
    if (!game) return;
    
    try {
      game.cancelDeploySession();
      console.log('✅ Deploy session cancelled');
      console.log('  FEN:', game.fen());
      console.log('  Turn:', game.turn());
      
      // Update game store with restored FEN
      // Reactive statement will update board automatically
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
          dests: mapPossibleMovesToDests($gameStore.possibleMoves),
          events: { after: handleMove, afterDeployStep: handleDeployStep }
        }
      });

      return () => {
        console.log('Cleaning up board and game subscription.');
        boardApi?.destroy();
        unsubscribe();
      };
    }
  });

  let isUpdatingBoard = false;

  $: if (boardApi && $gameStore.fen) {
    const reactiveStart = performance.now();
    console.log('🔄 Reactive statement triggered by FEN change');
    isUpdatingBoard = true;
    reSetupBoard();
    // Use setTimeout to ensure the board update completes before allowing new moves
    setTimeout(() => {
      isUpdatingBoard = false;
      const reactiveEnd = performance.now();
      console.log(`⏱️ REACTIVE update completed in ${(reactiveEnd - reactiveStart).toFixed(2)}ms`);
    }, 0);
  }
</script>

<main>
  <div class="layout-container">
    <h1>CoTuLenh</h1>
    <div class="game-layout">
      <div bind:this={boardContainerElement} class="board-container">
        {#if !boardApi}<p>Loading board...</p>{/if}
      </div>

      <div class="game-info-container">
        <GameInfo />
        <GameControls {game} />
        <DeployControls {game} onCommit={commitDeploy} onCancel={cancelDeploy} />
        <CombinationPanel {game} />
        <HeroicStatusPanel {game} />
      </div>
    </div>
  </div>
</main>

<style>
  .layout-container {
    max-width: 1200px;
    margin: 1rem auto;
    padding: 1rem;
  }

  .game-layout {
    display: grid;
    grid-template-columns: minmax(300px, 1fr) 250px;
    gap: 2rem;
    align-items: start;
  }

  .board-container {
    width: 700px;
    aspect-ratio: 12 / 13; /* Adjust if necessary for CoTuLenh */
    position: relative;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .game-info-container {
    flex: 1;
    min-width: 250px;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    max-height: 600px;
    overflow-y: auto;
  }

  h1 {
    text-align: center;
    margin-bottom: 1.5rem;
    color: var(--text-primary);
  }

  @media (max-width: 1000px) {
    .game-layout {
      grid-template-columns: 1fr;
    }

    .board-container {
      width: 100%;
      max-width: 600px;
      margin: 0 auto;
    }

    .game-info-container {
      width: 100%;
      max-height: none;
    }
  }
</style>
