<script lang="ts">
  import { onMount } from 'svelte';
  import { CotulenhBoard, origMoveToKey } from '@repo/cotulenh-board';
  import type { Api, Role as BoardRole, DestMove, OrigMove, OrigMoveKey, Role, StackMove, MoveMetadata } from '@repo/cotulenh-board';
  import { CoTuLenh, getCoreTypeFromRole, getRoleFromCoreType } from '@repo/cotulenh-core';
  import type { Square, Color, Move, DeployMoveRequest } from '@repo/cotulenh-core';
  import type { Key, Dests } from '@repo/cotulenh-board';
  import GameInfo from '$lib/components/GameInfo.svelte';
  // import DeployPanel from '$lib/components/DeployPanel.svelte';
  import CombinationPanel from '$lib/components/CombinationPanel.svelte';
  import HeroicStatusPanel from '$lib/components/HeroicStatusPanel.svelte';
  import GameControls from '$lib/components/GameControls.svelte';
  import { gameStore } from '$lib/stores/game';

  import '@repo/cotulenh-board/assets/commander-chess.base.css';
  import '@repo/cotulenh-board/assets/commander-chess.pieces.css';
  import '@repo/cotulenh-board/assets/commander-chess.clasic.css';
    import { convertBoardPieceToCorePiece, makeCoreMove } from '$lib/utils';

  let boardContainerElement: HTMLElement | null = null;
  let boardApi: Api | null = null;
  let game: CoTuLenh | null = null;

  function coreToBoardColor(coreColor: Color | null): 'red' | 'blue' | undefined {
    return coreColor ? (coreColor === 'r' ? 'red' : 'blue') : undefined;
  }

  function coreToBoardCheck(check: boolean, coreColor: Color | null): 'red' | 'blue' | undefined {
    return check ? coreToBoardColor(coreColor) : undefined;
  }

  function reSetupBoard() {
    if (boardApi) {
        boardApi.set({
          fen: $gameStore.fen,
          turnColor: coreToBoardColor($gameStore.turn),
          lastMove: mapLastMoveToBoardFormat($gameStore.lastMove),
          check: coreToBoardCheck($gameStore.check, $gameStore.turn),
          movable: {
            free: false,
            color: coreToBoardColor($gameStore.turn),
            dests: mapPossibleMovesToDests($gameStore.possibleMoves),
            events: { after: handleMove, afterStackMove: handleStackMove }
          }
        });
      }
  }

  function mapPossibleMovesToDests(possibleMoves: Move[]): Dests {
    const dests = new Map<OrigMoveKey, DestMove[]>();
    for (const move of possibleMoves) {
        const moveOrig: OrigMove = {
            square: move.from,
            type: getRoleFromCoreType(move.piece) as Role,
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

  function handleStackMove(stackMove: StackMove, metadata: MoveMetadata) {
    if (!game) return;

    console.log('Board stack move attempt:', stackMove, metadata);

    // Construct DeployMoveRequest from stackMove
    // This assumes stackMove.orig.square is the 'from' square
    // and stackMove.dest.square is the 'to' square for the deployed piece.
    // You might need to adjust this based on your exact StackMove structure
    // and how it maps to DeployMoveRequest.
    const deployMoveRequest: DeployMoveRequest = {
      from: stackMove.orig,
      moves: stackMove.moves.map(move => ({ piece: convertBoardPieceToCorePiece(move.piece), to: move.dest })),
      stay: stackMove.stay ? convertBoardPieceToCorePiece(stackMove.stay) : undefined,
    };

    try {
      const deployMoveResult = game.deployMove(deployMoveRequest);
      console.log('Deploy move result:', deployMoveResult);

      if (deployMoveResult) {
        console.log('Game deploy move successful:', deployMoveResult);
        // Assuming you have a method in gameStore to handle deploy moves
        // Similar to applyMove, you might need applyDeployMove or similar
        gameStore.applyDeployMove(game, deployMoveResult); // You'll need to implement this in gameStore
      } else {
        // This case might not be reachable if deployMove throws on failure
        console.warn('Illegal deploy move attempted on board:', stackMove);
      }
    } catch (error) {
      reSetupBoard(); // Reset board to a consistent state on error
      console.error('Error making deploy move in game engine:', error);
    }
  }

  onMount(() => {
    if (boardContainerElement) {
      console.log('Initializing game logic and board...');
      game = new CoTuLenh();
      gameStore.initialize(game);

      const unsubscribe = gameStore.subscribe((state) => {
        // console.log('Game state updated in store:', state);
      });

      boardApi = CotulenhBoard(boardContainerElement, {
        fen: $gameStore.fen,
        turnColor: coreToBoardColor($gameStore.turn),
        lastMove: mapLastMoveToBoardFormat($gameStore.lastMove),
        check: coreToBoardCheck($gameStore.check, $gameStore.turn),
        movable: {
          free: false,
          color: coreToBoardColor($gameStore.turn),
          dests: mapPossibleMovesToDests($gameStore.possibleMoves),
          events: { after: handleMove, afterStackMove: handleStackMove }
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
    boardApi.set({
      fen: $gameStore.fen,
      turnColor: coreToBoardColor($gameStore.turn),
      lastMove: mapLastMoveToBoardFormat($gameStore.lastMove),
      check: coreToBoardCheck($gameStore.check, $gameStore.turn),
      movable: {
        color: coreToBoardColor($gameStore.turn),
        dests: mapPossibleMovesToDests($gameStore.possibleMoves),
        events: { after: handleMove, afterStackMove: handleStackMove }
      }
    });
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
        <!-- <DeployPanel {game} /> -->
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
