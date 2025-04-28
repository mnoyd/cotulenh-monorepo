<script lang="ts">
  import { gameStore } from '$lib/stores/game';
  import { CoTuLenh } from '@repo/cotulenh-core';
  import type { Square, Color, Move, Piece } from '@repo/cotulenh-core';
  import { getTurnColorName } from '$lib/utils';

  export let game: CoTuLenh | null = null;

  // Track possible combination moves
  let combinationMoves: Move[] = [];

  // Update combination moves when game state changes
  $: {
    if (game && $gameStore.status === 'playing') {
      const allMoves = game.moves({ verbose: true }) as Move[];
      combinationMoves = allMoves.filter((move) => move.flags.includes('c')); // 'c' for combination flag
    } else {
      combinationMoves = [];
    }
  }

  // Handle combination of pieces
  function handleCombination(move: Move) {
    if (!game) return;

    try {
      // Attempt to make the combination move
      const moveResult = game.move({
        from: move.from,
        to: move.to
      });

      if (moveResult) {
        console.log('Combination move successful:', moveResult);
        gameStore.applyMove(game, moveResult);
      } else {
        console.warn('Illegal combination move attempted');
      }
    } catch (error) {
      console.error('Error making combination move:', error);
    }
  }

  // Get piece display name
  function getPieceDisplayName(pieceType: string): string {
    const pieceNames: Record<string, string> = {
      c: 'Commander',
      i: 'Infantry',
      t: 'Tank',
      m: 'Militia',
      e: 'Engineer',
      a: 'Artillery',
      g: 'Anti-Air',
      s: 'Missile',
      f: 'Air Force',
      n: 'Navy',
      h: 'Headquarter'
    };
    return pieceNames[pieceType] || pieceType.toUpperCase();
  }

  // Get piece CSS class
  function getPieceClass(pieceType: string, color: Color): string {
    return `piece-${pieceType} ${color === 'r' ? 'red' : 'blue'}`;
  }

  // Group combination moves by source piece
  function groupCombinationMoves(moves: Move[]): Record<string, Move[]> {
    const grouped: Record<string, Move[]> = {};

    for (const move of moves) {
      const key = `${move.from}-${move.piece.type}`;
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(move);
    }

    return grouped;
  }

  $: groupedMoves = groupCombinationMoves(combinationMoves);
</script>

<div class="combination-panel">
  <h3>Combination Panel</h3>

  {#if combinationMoves.length > 0}
    <div class="combinations-container">
      {#each Object.entries(groupedMoves) as [key, moves]}
        {@const firstMove = moves[0]}
        <div class="combination-group">
          <div class="source-piece">
            <div class={getPieceClass(firstMove.piece.type, firstMove.color)}></div>
            <span>{getPieceDisplayName(firstMove.piece.type)} at {firstMove.from}</span>
          </div>

          <div class="target-options">
            <span class="can-combine-with">Can combine with:</span>
            <div class="targets-grid">
              {#each moves as move}
                {@const targetPiece = move.otherPiece}
                {#if targetPiece}
                  <button class="target-button" on:click={() => handleCombination(move)}>
                    <div class={getPieceClass(targetPiece.type, targetPiece.color)}></div>
                    <span>{getPieceDisplayName(targetPiece.type)} at {move.to}</span>
                  </button>
                {/if}
              {/each}
            </div>
          </div>
        </div>
      {/each}
    </div>
  {:else if $gameStore.status === 'playing'}
    <p class="info-message">
      No combination moves available for {getTurnColorName($gameStore.turn || 'r')}.
    </p>
  {:else}
    <p class="info-message">Game over. {$gameStore.status}</p>
  {/if}
</div>

<style>
  .combination-panel {
    background: var(--surface-2, #f0f0f0);
    padding: 1rem;
    border-radius: 8px;
    margin-top: 1rem;
  }

  h3 {
    margin-top: 0;
    color: var(--text-primary, #333);
  }

  .combinations-container {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .combination-group {
    background: var(--surface-1, #fff);
    border: 1px solid var(--border-color, #ddd);
    border-radius: 4px;
    padding: 0.75rem;
  }

  .source-piece {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.75rem;
    font-weight: bold;
  }

  .can-combine-with {
    display: block;
    font-size: 0.9rem;
    color: var(--text-secondary, #666);
    margin-bottom: 0.5rem;
  }

  .targets-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 0.5rem;
  }

  .target-button {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem;
    background: var(--surface-3, #f5f5f5);
    border: 1px solid var(--border-color, #ddd);
    border-radius: 4px;
    cursor: pointer;
    transition: background-color 0.2s ease;
    text-align: left;
  }

  .target-button:hover {
    background-color: var(--hover-bg, #e9e9e9);
  }

  /* Piece visualization classes - these should match your board styling */
  [class^='piece-'] {
    width: 24px;
    height: 24px;
    background-size: contain;
    background-repeat: no-repeat;
    background-position: center;
    flex-shrink: 0;
  }

  .info-message {
    color: var(--text-secondary, #666);
    font-style: italic;
  }
</style>
