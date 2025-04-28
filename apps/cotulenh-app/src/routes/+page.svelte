<script lang="ts">
  import { onMount } from 'svelte';
  import { CotulenhBoard } from '@repo/cotulenh-board';
  import type { Api } from '@repo/cotulenh-board';
  import { CoTuLenh } from '@repo/cotulenh-core';
  import type { Square, Color, Move } from '@repo/cotulenh-core';
  import type { Key, Dests } from '@repo/cotulenh-board';
  import {
    algebraicToNumeric,
    numericToAlgebraic,
    numericToAlgebraicPair
  } from '@repo/cotulenh-notation';
  import GameInfo from '$lib/components/GameInfo.svelte';
  import DeployPanel from '$lib/components/DeployPanel.svelte';
  import CombinationPanel from '$lib/components/CombinationPanel.svelte';
  import HeroicStatusPanel from '$lib/components/HeroicStatusPanel.svelte';
  import GameControls from '$lib/components/GameControls.svelte';
  import { gameStore } from '$lib/stores/game';

  import '@repo/cotulenh-board/assets/commander-chess.base.css';
  import '@repo/cotulenh-board/assets/commander-chess.pieces.css';
  import '@repo/cotulenh-board/assets/commander-chess.clasic.css';

  let boardContainerElement: HTMLElement | null = null;
  let boardApi: Api | null = null;
  let game: CoTuLenh | null = null;

  function coreToBoardColor(coreColor: Color | null): 'red' | 'blue' | undefined {
    return coreColor ? (coreColor === 'r' ? 'red' : 'blue') : undefined;
  }

  function coreToBoardCheck(check: boolean, coreColor: Color | null): 'red' | 'blue' | undefined {
    return check ? coreToBoardColor(coreColor) : undefined;
  }

  function mapPossibleMovesToDests(possibleMoves: Map<Square, Square[]>): Dests {
    const dests: Dests = new Map();
    for (const [fromSq, toSqs] of possibleMoves.entries()) {
      const fromKey = algebraicToNumeric(fromSq);
      if (fromKey) {
        const toKeys = toSqs
          .map((sq) => algebraicToNumeric(sq))
          .filter((key) => key !== null) as Key[];
        if (toKeys.length > 0) {
          dests.set(fromKey, toKeys);
        }
      }
    }
    console.log('Possible moves mapped to board format:', dests);
    return dests;
  }

  function mapLastMoveToBoardFormat(
    lastMove: [Square, Square] | undefined
  ): [Key, Key] | undefined {
    if (!lastMove) return undefined;
    const fromKey = algebraicToNumeric(lastMove[0]);
    const toKey = algebraicToNumeric(lastMove[1]);
    return fromKey && toKey ? [fromKey, toKey] : undefined;
  }

  function handleMove(orig: Key, dest: Key) {
    if (!game) return;

    console.log('Board move attempt:', orig, '->', dest);

    try {
      const algebraicMove = numericToAlgebraicPair(orig, dest);
      console.log('Algebraic move:', algebraicMove);
      const moveResult = game.move({ from: algebraicMove[0], to: algebraicMove[1] });

      if (moveResult) {
        console.log('Game move successful:', moveResult);
        gameStore.applyMove(game, moveResult);
      } else {
        console.warn('Illegal move attempted on board:', orig, '->', dest);
      }
    } catch (error) {
      console.error('Error making move in game engine:', error);
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
          events: { after: handleMove }
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
        events: { after: handleMove }
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
        <DeployPanel {game} />
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
