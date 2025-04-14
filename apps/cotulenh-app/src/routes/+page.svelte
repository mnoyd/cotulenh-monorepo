<script lang="ts">
  import { onMount } from 'svelte';
  import { CotulenhBoard } from '@repo/cotulenh-board';
  import type { Api } from '@repo/cotulenh-board/api';
  import { CoTuLenh } from '@repo/cotulenh-core';
  import type { Square, Move, PieceSymbol, Color } from '@repo/cotulenh-core';
  import type { Dests, Key, MoveMetadata } from '@repo/cotulenh-board/types';
  import { algebraicToNumeric, numericToAlgebraic, toDests } from '@repo/cotulenh-notation';

  import '@repo/cotulenh-board/assets/commander-chess.base.css';
  import '@repo/cotulenh-board/assets/commander-chess.pieces.css';
  import '@repo/cotulenh-board/assets/commander-chess.clasic.css';

  let boardContainerElement: HTMLElement | null = null;
  let boardApi: Api | null = null;
  let game: CoTuLenh | null = null;
  let currentTurn: Color | null = null;

  // Reactive declaration for turn display
  $: turnDisplay = currentTurn ? (currentTurn === 'r' ? 'Red' : 'Blue') : '...';

  // --- Type Mapping Helpers ---
  function coreToBoardColor(coreColor: Color): 'red' | 'blue' {
    return coreColor === 'r' ? 'red' : 'blue';
  }

  function coreToBoardCheck(coreColor: Color | undefined): 'red' | 'blue' | undefined {
    return coreColor ? coreToBoardColor(coreColor) : undefined;
  }
  // ---------------------------

  function movesToDests(moves: Move[]): Dests {
    const dests: Dests = new Map();
    for (const move of moves) {
      // Convert algebraic 'from' and 'to' squares to numeric keys
      const fromKey = algebraicToNumeric(move.from as Square);
      const toKey = algebraicToNumeric(move.to as Square);

      // Skip if conversion failed (shouldn't happen with valid moves)
      if (!fromKey || !toKey) {
        console.warn(`Skipping invalid move conversion: ${move.from} -> ${move.to}`);
        continue;
      }

      const existing = dests.get(fromKey);
      if (existing) {
        existing.push(toKey);
      } else {
        dests.set(fromKey, [toKey]);
      }
    }
    return dests;
  }

  function handleMove(orig: Key, dest: Key, metadata: MoveMetadata) {
    if (!game || !boardApi) return;

    console.log('Board move:', orig, '->', dest);

    try {
      const moveResult = game.move({ from: orig as Square, to: dest as Square });

      if (moveResult) {
        console.log('Game move successful:', moveResult);
        const newFen = game.fen();
        const newTurn = game.turn();
        const newMoves = game.moves({ verbose: true }) as Move[];
        const newDests = movesToDests(newMoves);
        const checkColor = game.isCheck() ? game.turn() : undefined; // Check if the new king is in check

        currentTurn = newTurn; // Update reactive turn variable

        // Update the board UI
        boardApi.set({
          fen: newFen,
          turnColor: coreToBoardColor(newTurn), // Use mapper
          lastMove: [orig, dest],
          check: coreToBoardCheck(checkColor), // Use mapper
          movable: {
            color: coreToBoardColor(newTurn), // Use mapper
            dests: newDests,
            showDests: true, // Keep showing destinations for the new turn
            events: { after: handleMove } // Re-register the handler
          }
        });
        // TODO: Update move history UI
      } else {
        console.error('Game move failed internally, but board allowed it? FEN:', game.fen());
        boardApi.set({ fen: game.fen() });
      }
    } catch (error) {
      console.error('Error making move in game engine:', error);
      boardApi.set({ fen: game.fen() });
    }
  }
  export function playOtherSide(boardApi: Api, game: CoTuLenh) {
    return (orig: Square, dest: Square) => {
      console.log('Other side move:', orig, '->', dest);
      const numericOrig = numericToAlgebraic(orig as Key);
      const numericDest = numericToAlgebraic(dest as Key);
      if (!numericOrig || !numericDest) return;
      game.move({ from: numericOrig, to: numericDest });
      boardApi.set({
        turnColor: coreToBoardColor(game.turn()),
        movable: {
          color: coreToBoardColor(game.turn()),
          dests: toDests(game)
        }
      });
    };
  }

  onMount(() => {
    if (boardContainerElement) {
      console.log('Board container element found');
      game = new CoTuLenh();
      console.log('toDests:', toDests(game));
      const initialFen = game.fen();
      const initialTurn = game.turn();
      currentTurn = initialTurn; // Set initial turn

      console.log('Initial turn:', initialTurn, coreToBoardColor(initialTurn));

      boardApi = CotulenhBoard(boardContainerElement, {
        fen: initialFen, // Set the initial position
        turnColor: coreToBoardColor(initialTurn), // Use mapper
        movable: {
          free: false, // Not a board editor
          color: coreToBoardColor(initialTurn), // Use mapper
          dests: toDests(game), // Provide map of legal moves
          // showDests: true // Highlight legal destination squares
        }
        // TODO: Add other configurations like orientation, animation?
      });
      boardApi.set({
        movable: { events: { after: playOtherSide(boardApi, game) } }
      });
    }
  });
</script>

<main>
  <h1>CoTuLenh Chess</h1>

  <div class="game-area">
    <div class="board-container" bind:this={boardContainerElement}>
      <!-- Board will be rendered here by CommanderChessBoard -->
    </div>

    <div class="game-info">
      <h2>Game Info</h2>
      <p>Turn: {turnDisplay}</p>
      <p>Orientation: ...</p>
      <h3>Move History</h3>
      <ul>
        <li>Move history unavailable.</li>
      </ul>
    </div>
  </div>
</main>

<style>
  .board-container {
    width: 700px;
    aspect-ratio: 12 / 13; /* Adjust if necessary for CoTuLenh */
    position: relative;
  }
  /* TODO: Add styles for .game-area, .game-info if needed */
</style>
