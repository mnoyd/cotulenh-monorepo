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
      for (let row = 0; row < board.length; row++) {
        for (let col = 0; col < board[row].length; col++) {
          const piece = board[row][col];
          if (piece && piece.heroic) {
            heroicPieces.push({square: piece.square, piece});
          }
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

</script>

<div class="heroic-card">
  <div class="card-header">
    <svg class="header-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
    <h3>Heroic Pieces</h3>
    {#if heroicPieces.length > 0}
      <span class="count-badge">{heroicPieces.length}</span>
    {/if}
  </div>

  <div class="card-content">
    {#if heroicPieces.length > 0}
      <div class="heroic-grid">
        {#each heroicPieces as {square, piece}}
          <div class="heroic-card-item" class:red={piece.color === 'r'} class:blue={piece.color === 'b'}>
            <div class="piece-icon" class:red={piece.color === 'r'} class:blue={piece.color === 'b'} data-piece={piece.type}>
              <span class="piece-symbol">{piece.type.toUpperCase()}</span>
            </div>
            <div class="piece-details">
              <div class="piece-name">{getPieceDisplayName(piece.type)}</div>
              <div class="piece-meta">
                <svg class="location-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M21 10C21 17 12 23 12 23C12 23 3 17 3 10C3 7.61305 3.94821 5.32387 5.63604 3.63604C7.32387 1.94821 9.61305 1 12 1C14.3869 1 16.6761 1.94821 18.364 3.63604C20.0518 5.32387 21 7.61305 21 10Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  <circle cx="12" cy="10" r="3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <span class="location-text">{square}</span>
              </div>
            </div>
            <div class="heroic-badge">
              <svg class="badge-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="currentColor"/>
              </svg>
            </div>
          </div>
        {/each}
      </div>
    {:else if $gameStore.status === 'playing'}
      <div class="empty-state">
        <svg class="empty-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <p>No heroic pieces on the battlefield yet</p>
        <span class="empty-hint">Pieces become heroic through special achievements</span>
      </div>
    {:else}
      <div class="empty-state">
        <p>Game over: {$gameStore.status}</p>
      </div>
    {/if}
  </div>
</div>

<style>
  .heroic-card {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    overflow: hidden;
    box-shadow: var(--shadow-md);
    transition: box-shadow var(--transition-base);
  }

  .heroic-card:hover {
    box-shadow: var(--shadow-lg);
  }

  .card-header {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-md) var(--spacing-lg);
    background: linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(234, 179, 8, 0.1));
    border-bottom: 1px solid var(--color-border);
  }

  .header-icon {
    width: 20px;
    height: 20px;
    color: var(--color-accent);
    stroke-width: 2;
  }

  .card-header h3 {
    flex: 1;
    font-size: 1.1rem;
    font-weight: 600;
    color: var(--color-text-primary);
    margin: 0;
  }

  .count-badge {
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 28px;
    height: 28px;
    padding: 0 var(--spacing-xs);
    background: linear-gradient(135deg, var(--color-accent), #eab308);
    color: var(--color-bg-base);
    font-weight: 700;
    font-size: 0.85rem;
    border-radius: 50%;
    box-shadow: 0 2px 4px rgba(245, 158, 11, 0.3);
  }

  .card-content {
    padding: var(--spacing-lg);
  }

  .heroic-grid {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
  }

  .heroic-card-item {
    display: grid;
    grid-template-columns: 48px 1fr auto;
    gap: var(--spacing-md);
    align-items: center;
    padding: var(--spacing-md);
    background: var(--color-bg-secondary);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    transition: all var(--transition-base);
    position: relative;
    overflow: hidden;
  }

  .heroic-card-item::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 4px;
    background: var(--color-accent);
    opacity: 0.6;
  }

  .heroic-card-item.red::before {
    background: var(--color-red);
  }

  .heroic-card-item.blue::before {
    background: var(--color-blue);
  }

  .heroic-card-item:hover {
    transform: translateX(4px);
    background: var(--color-bg-tertiary);
    box-shadow: var(--shadow-sm);
  }

  .piece-icon {
    width: 48px;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2px solid var(--color-border);
    border-radius: var(--radius-md);
    background-size: 70%;
    background-repeat: no-repeat;
    background-position: center;
  }

  .piece-icon.red {
    border-color: var(--color-red);
    background-color: rgba(220, 38, 38, 0.05);
  }

  .piece-icon.blue {
    border-color: var(--color-blue);
    background-color: rgba(59, 130, 246, 0.05);
  }

  /* Hide text when showing icons */
  .piece-icon[data-piece] .piece-symbol { display: none; }

  /* Red pieces - Base64 SVG icons */
  .piece-icon.red[data-piece="c"] { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23dc2626'%3E%3Cpath d='M12 2l2.5 6h6.5l-5 4 2 7-6-4.5-6 4.5 2-7-5-4h6.5z'/%3E%3C/svg%3E"); }
  .piece-icon.red[data-piece="i"] { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23dc2626'%3E%3Cpath d='M12 2c-1 0-2 1-2 2v16c0 1 1 2 2 2s2-1 2-2V4c0-1-1-2-2-2zm-3 18h6v2h-6z'/%3E%3C/svg%3E"); }
  .piece-icon.red[data-piece="t"] { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23dc2626'%3E%3Crect x='4' y='10' width='16' height='10' rx='2'/%3E%3Crect x='8' y='6' width='8' height='5' rx='1'/%3E%3Ccircle cx='7' cy='20' r='2'/%3E%3Ccircle cx='17' cy='20' r='2'/%3E%3C/svg%3E"); }
  .piece-icon.red[data-piece="m"] { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23dc2626'%3E%3Cpath d='M12 2L8 8h8zm-6 8h12v10H6z'/%3E%3C/svg%3E"); }
  .piece-icon.red[data-piece="e"] { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23dc2626'%3E%3Cpath d='M4 6h16v3H4zm2 5h12v2H6zm1 4h10v2H7zm2 4h6v2H9z'/%3E%3C/svg%3E"); }
  .piece-icon.red[data-piece="a"] { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23dc2626'%3E%3Ccircle cx='12' cy='12' r='3'/%3E%3Cpath d='M12 2v4m0 12v4M2 12h4m12 0h4'/%3E%3C/svg%3E"); }
  .piece-icon.red[data-piece="g"] { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23dc2626'%3E%3Cpath d='M12 2v8m-4-4l4 4 4-4M6 14h12v6H6z'/%3E%3C/svg%3E"); }
  .piece-icon.red[data-piece="s"] { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23dc2626'%3E%3Cpath d='M12 2l-2 8h4l-2 12 6-10h-4l2-10z'/%3E%3C/svg%3E"); }
  .piece-icon.red[data-piece="f"] { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23dc2626'%3E%3Cpath d='M12 2l-8 6v4l8-3 8 3V8zm0 10l-8 3v5h16v-5z'/%3E%3C/svg%3E"); }
  .piece-icon.red[data-piece="n"] { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23dc2626'%3E%3Cpath d='M4 6h16l-2 6H6zm-1 8h18v8H3z'/%3E%3C/svg%3E"); }
  .piece-icon.red[data-piece="h"] { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23dc2626'%3E%3Cpath d='M3 20h18v2H3zm2-2h14l-2-6H7zm1-8h10l-2-6H8z'/%3E%3C/svg%3E"); }

  /* Blue pieces - Base64 SVG icons */
  .piece-icon.blue[data-piece="c"] { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%233b82f6'%3E%3Cpath d='M12 2l2.5 6h6.5l-5 4 2 7-6-4.5-6 4.5 2-7-5-4h6.5z'/%3E%3C/svg%3E"); }
  .piece-icon.blue[data-piece="i"] { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%233b82f6'%3E%3Cpath d='M12 2c-1 0-2 1-2 2v16c0 1 1 2 2 2s2-1 2-2V4c0-1-1-2-2-2zm-3 18h6v2h-6z'/%3E%3C/svg%3E"); }
  .piece-icon.blue[data-piece="t"] { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%233b82f6'%3E%3Crect x='4' y='10' width='16' height='10' rx='2'/%3E%3Crect x='8' y='6' width='8' height='5' rx='1'/%3E%3Ccircle cx='7' cy='20' r='2'/%3E%3Ccircle cx='17' cy='20' r='2'/%3E%3C/svg%3E"); }
  .piece-icon.blue[data-piece="m"] { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%233b82f6'%3E%3Cpath d='M12 2L8 8h8zm-6 8h12v10H6z'/%3E%3C/svg%3E"); }
  .piece-icon.blue[data-piece="e"] { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%233b82f6'%3E%3Cpath d='M4 6h16v3H4zm2 5h12v2H6zm1 4h10v2H7zm2 4h6v2H9z'/%3E%3C/svg%3E"); }
  .piece-icon.blue[data-piece="a"] { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%233b82f6'%3E%3Ccircle cx='12' cy='12' r='3'/%3E%3Cpath d='M12 2v4m0 12v4M2 12h4m12 0h4'/%3E%3C/svg%3E"); }
  .piece-icon.blue[data-piece="g"] { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%233b82f6'%3E%3Cpath d='M12 2v8m-4-4l4 4 4-4M6 14h12v6H6z'/%3E%3C/svg%3E"); }
  .piece-icon.blue[data-piece="s"] { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%233b82f6'%3E%3Cpath d='M12 2l-2 8h4l-2 12 6-10h-4l2-10z'/%3E%3C/svg%3E"); }
  .piece-icon.blue[data-piece="f"] { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%233b82f6'%3E%3Cpath d='M12 2l-8 6v4l8-3 8 3V8zm0 10l-8 3v5h16v-5z'/%3E%3C/svg%3E"); }
  .piece-icon.blue[data-piece="n"] { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%233b82f6'%3E%3Cpath d='M4 6h16l-2 6H6zm-1 8h18v8H3z'/%3E%3C/svg%3E"); }
  .piece-icon.blue[data-piece="h"] { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%233b82f6'%3E%3Cpath d='M3 20h18v2H3zm2-2h14l-2-6H7zm1-8h10l-2-6H8z'/%3E%3C/svg%3E"); }

  .piece-symbol {
    font-family: 'Courier New', monospace;
    font-weight: 800;
    font-size: 1.4rem;
  }

  .piece-details {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
  }

  .piece-name {
    font-size: 1rem;
    font-weight: 600;
    color: var(--color-text-primary);
  }

  .piece-meta {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 0.85rem;
    color: var(--color-text-tertiary);
  }

  .location-icon {
    width: 14px;
    height: 14px;
    stroke-width: 2;
  }

  .location-text {
    font-family: 'Courier New', monospace;
    font-weight: 600;
  }

  .heroic-badge {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, var(--color-accent), #eab308);
    border-radius: 50%;
    color: var(--color-bg-base);
    box-shadow: 0 2px 6px rgba(245, 158, 11, 0.4);
    animation: shimmer 2s ease-in-out infinite;
  }

  @keyframes shimmer {
    0%, 100% {
      box-shadow: 0 2px 6px rgba(245, 158, 11, 0.4);
    }
    50% {
      box-shadow: 0 4px 12px rgba(245, 158, 11, 0.6);
    }
  }

  .badge-icon {
    width: 18px;
    height: 18px;
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-xl) var(--spacing-md);
    text-align: center;
    color: var(--color-text-tertiary);
  }

  .empty-icon {
    width: 64px;
    height: 64px;
    opacity: 0.3;
    stroke-width: 1.5;
  }

  .empty-state p {
    margin: 0;
    font-size: 0.95rem;
    color: var(--color-text-secondary);
  }

  .empty-hint {
    font-size: 0.8rem;
    font-style: italic;
    color: var(--color-text-tertiary);
  }

  @media (max-width: 768px) {
    .card-header {
      padding: var(--spacing-sm) var(--spacing-md);
    }

    .card-content {
      padding: var(--spacing-md);
    }

    .heroic-card-item {
      grid-template-columns: 40px 1fr auto;
      gap: var(--spacing-sm);
      padding: var(--spacing-sm);
    }

    .piece-icon {
      width: 40px;
      height: 40px;
    }

    [class^="piece-"] {
      width: 32px;
      height: 32px;
    }

    .piece-name {
      font-size: 0.9rem;
    }

    .heroic-badge {
      width: 28px;
      height: 28px;
    }

    .badge-icon {
      width: 16px;
      height: 16px;
    }
  }
</style>