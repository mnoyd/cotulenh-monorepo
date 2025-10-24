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
    if (boardApi) {
        boardApi.set({
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
      }
    return boardApi;
  }

  function mapPossibleMovesToDests(possibleMoves: Move[]): Dests {
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
    if (!game) return;

    console.log('Board move attempt:', orig, '->', dest);

    try {
      const moveResult = makeCoreMove(game, orig, dest);
      console.log('Move result:', moveResult); // Log the result for diagnostic

      if (moveResult) {
        console.log('Game move successful:', moveResult);
        gameStore.applyMove(game, moveResult);
      } else {
        console.warn('Illegal move attempted on board:', orig, '->', dest);
      }
    } catch (error) {
      reSetupBoard();
      console.error('Error making move in game engine:', error);
    }
  }

  /**
   * Handle individual deploy step (incremental mode)
   * Fires immediately when user moves a piece during deployment
   */
  function handleDeployStep(move: SingleDeployMove, metadata: DeployStepMetadata) {
    if (!game) {
      console.error('No game instance available');
      return;
    }

    console.log('Deploy step:', move, metadata);

    try {
      // Convert board piece type to core piece type
      const coreType = roleToType(move.piece.role);
      
      // Send individual move to core
      const result = game.move({
        from: move.from,
        to: move.to,
        piece: coreType,
        deploy: true
      });

      if (!result) {
        console.error('Deploy move rejected by core:', move);
        return;
      }

      console.log('Deploy move accepted:', result);

      // Get updated legal moves from core
      // Core will generate moves for remaining pieces + recombine moves
      const updatedMoves = game.moves({ verbose: true }) as Move[];
      
      console.log('Updated legal moves count:', updatedMoves.length);

      // Convert to board destination format
      const newDests = mapPossibleMovesToDests(updatedMoves);
      
      // Update board with new legal move destinations
      boardApi?.set({
        movable: {
          dests: newDests
        }
      });

      console.log('Board destinations updated');

    } catch (error) {
      console.error('Deploy step failed:', error);
      reSetupBoard();
    }
  }

  /**
   * Manually commit the active deploy session
   */
  function commitDeploy() {
    if (!game) return;
    
    try {
      game.commitDeploySession();
      
      console.log('Deploy session committed successfully');
      
      // Update game store with final state
      gameStore.initialize(game);
      
      // Update board for normal moves
      const normalMoves = game.moves({ verbose: true }) as Move[];
      boardApi?.set({
        fen: game.fen(),
        turnColor: coreToBoardColor(game.turn()),
        check: game.isCheck() ? coreToBoardColor(game.turn()) : undefined,
        movable: {
          dests: mapPossibleMovesToDests(normalMoves)
        }
      });
      
      console.log('Board updated for normal play');
    } catch (error) {
      console.error('Failed to commit deploy session:', error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      alert(`Cannot finish deployment: ${errorMsg}`);
    }
  }

  /**
   * Cancel the active deploy session
   */
  function cancelDeploy() {
    if (!game) return;
    
    try {
      game.cancelDeploySession();
      
      console.log('Deploy session cancelled, board restored');
      
      // Update game store
      gameStore.initialize(game);
      
      // Restore board to pre-deploy state
      const normalMoves = game.moves({ verbose: true }) as Move[];
      boardApi?.set({
        fen: game.fen(),
        turnColor: coreToBoardColor(game.turn()),
        check: game.isCheck() ? coreToBoardColor(game.turn()) : undefined,
        movable: {
          dests: mapPossibleMovesToDests(normalMoves)
        }
      });
      
      console.log('Board restored to pre-deployment state');
    } catch (error) {
      console.error('Failed to cancel deploy:', error);
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

  $: if (boardApi && $gameStore.fen) {
   reSetupBoard();
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
