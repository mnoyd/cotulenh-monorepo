<script lang="ts">
  import { gameStore } from '$lib/stores/game';
  import { CoTuLenh } from '@repo/cotulenh-core';
  import type { Square, Color, Piece } from '@repo/cotulenh-core';
  import { getTurnColorName } from '$lib/utils';

  export let game: CoTuLenh | null = null;

  // Track heroic pieces
  let heroicPieces: {square: Square, piece: Piece}[] = [];

  // Update heroic pieces when game state changes
  $: {
    if (game && $gameStore.status === 'playing') {
      heroicPieces = [];
      // Scan the board for heroic pieces
      const board = game.board();
      for (let i = 0; i < board.length; i++) {
        const piece = board[i];
        if (piece && piece.heroic) {
          const square = game.algebraic(i) as Square;
          heroicPieces.push({square, piece});
        }
      }
    } else {
      heroicPieces = [];
    }
  }

  // Get piece display name
  function getPieceDisplayName(pieceType: string): string {
    const pieceNames: Record<string, string> = {
      'c': 'Commander',
      'i': 'Infantry',
      't': 'Tank',
      'm': 'Militia',
      'e': 'Engineer',
      'a': 'Artillery',
      'g': 'Anti-Air',
      's': 'Missile',
      'f': 'Air Force',
      'n': 'Navy',
      'h': 'Headquarter'
    };
    return pieceNames[pieceType] || pieceType.toUpperCase();
  }

  // Get piece CSS class
  function getPieceClass(pieceType: string, color: Color): string {
    return `piece-${pieceType} ${color === 'r' ? 'red' : 'blue'}`;
  }
</script>

<div class="heroic-panel">
  <h3>Heroic Pieces</h3>
  
  {#if heroicPieces.length > 0}
    <div class="heroic-pieces-grid">
      {#each heroicPieces as {square, piece}}
        <div class="heroic-piece">
          <div class={getPieceClass(piece.type, piece.color)}></div>
          <div class="piece-info">
            <span class="piece-name">{getPieceDisplayName(piece.type)}</span>
            <span class="piece-location">at {square}</span>
            <span class="heroic-badge">HEROIC</span>
          </div>
        </div>
      {/each}
    </div>
  {:else if $gameStore.status === 'playing'}
    <p class="info-message">
      No heroic pieces on the board yet.
    </p>
  {:else}
    <p class="info-message">Game over. {$gameStore.status}</p>
  {/if}
</div>

<style>
  .heroic-panel {
    background: var(--surface-2, #f0f0f0);
    padding: 1rem;
    border-radius: 8px;
    margin-top: 1rem;
  }
  
  h3 {
    margin-top: 0;
    color: var(--text-primary, #333);
  }
  
  .heroic-pieces-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 0.75rem;
  }
  
  .heroic-piece {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    background: var(--surface-1, #fff);
    border: 1px solid var(--border-color, #ddd);
    border-radius: 4px;
    padding: 0.5rem;
  }
  
  .piece-info {
    display: flex;
    flex-direction: column;
    font-size: 0.9rem;
  }
  
  .piece-name {
    font-weight: bold;
  }
  
  .piece-location {
    color: var(--text-secondary, #666);
    font-size: 0.8rem;
  }
  
  .heroic-badge {
    display: inline-block;
    background: var(--accent-color, #ffc107);
    color: var(--accent-text, #000);
    font-size: 0.7rem;
    font-weight: bold;
    padding: 0.1rem 0.3rem;
    border-radius: 3px;
    margin-top: 0.25rem;
  }
  
  /* Piece visualization classes - these should match your board styling */
  [class^="piece-"] {
    width: 30px;
    height: 30px;
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