<script lang="ts">
  import type { Api, Piece, Role, Color } from '@repo/cotulenh-board';
  import { onMount } from 'svelte';

  export let boardApi: Api | null = null;
  export let color: Color = 'red'; // Which color pieces to show
  export let onPieceSelect: (role: Role, color: Color) => void = () => {};
  export let selectedPiece: { role: Role; color: Color; promoted?: boolean } | null = null;
  export let heroicMode: boolean = false; // Whether pieces should be heroic (promoted)

  const roles: Role[] = [
    'commander',
    'infantry',
    'tank',
    'militia',
    'engineer',
    'artillery',
    'anti_air',
    'missile',
    'air_force',
    'navy',
    'headquarter',
  ];

  // Create piece objects with proper state - promoted represents heroic in board terminology
  let pieces: Piece[] = [];
  
  // Initialize or update pieces based on color and heroicMode
  $: {
    pieces = roles.map(role => ({
      role,
      color,
      promoted: heroicMode && role !== 'commander' ? true : undefined
    }));
  }

  function handlePieceDragStart(piece: Piece, event: MouseEvent | TouchEvent) {
    event.preventDefault();
    
    if (!boardApi) return;
    
    try {
      // Use the board's built-in dragNewPiece method with the actual piece object
      // force=true allows replacing existing pieces
      boardApi.dragNewPiece(piece, event as any, true);
      console.log(`Started dragging ${piece.color} ${piece.role}${piece.promoted ? ' (heroic)' : ''}`);
    } catch (error) {
      console.error('Error starting drag:', error);
    }
  }

  function formatRoleName(role: Role): string {
    return role
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
</script>

<div class="palette-container">
  <div class="pieces-grid">
    {#each pieces as piece}
      <div
        class="palette-piece-wrapper"
        class:selected={selectedPiece?.role === piece.role && selectedPiece?.color === piece.color && selectedPiece?.promoted === piece.promoted}
        title="{formatRoleName(piece.role)}"
      >
        <div 
          class="cg-wrap palette-piece-container"
          role="button"
          tabindex="0"
          on:mousedown={(e) => handlePieceDragStart(piece, e)}
          on:touchstart={(e) => handlePieceDragStart(piece, e)}
          on:click={(e) => {
            e.stopPropagation();
            onPieceSelect(piece.role, piece.color);
          }}
          on:keydown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onPieceSelect(piece.role, piece.color);
            }
          }}
        >
          <piece class="{piece.role} {piece.color}" class:promoted={piece.promoted}>
            <!-- Piece will be rendered via CSS background from commander-chess.pieces.css -->
            <!-- Heroic (promoted) pieces get golden glow and star indicator -->
          </piece>
        </div>
        <span class="piece-label">{formatRoleName(piece.role)}</span>
      </div>
    {/each}
  </div>
</div>

<style>
  .palette-container {
    display: flex;
    flex-direction: column;
  }

  .pieces-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.25rem;
  }

  .palette-piece-wrapper {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.1rem;
    padding: 0.15rem;
    border-radius: 6px;
    transition: background-color 0.2s;
  }

  .palette-piece-wrapper.selected {
    background-color: rgba(0, 123, 255, 0.15);
    box-shadow: 0 0 0 2px #007bff;
  }

  .palette-piece-container {
    width: 45px;
    height: 45px;
    border: 2px solid transparent;
    border-radius: 6px;
    cursor: grab;
    transition: all 0.2s ease;
    position: relative;
  }

  /* Piece images come from commander-chess.pieces.css */
  /* The CSS selector is: .cg-wrap piece.{role}.{color} */
  .palette-piece-container piece {
    display: block;
    width: 100%;
    height: 100%;
    background-size: 80% 80%;
    background-repeat: no-repeat;
    background-position: center;
    pointer-events: none; /* Let events pass through to container */
  }

  .palette-piece-container:hover {
    transform: scale(1.08);
    border-color: #007bff;
    box-shadow: 0 2px 8px rgba(0, 123, 255, 0.3);
  }

  .palette-piece-wrapper.selected .palette-piece-container {
    border-color: #007bff;
    background-color: rgba(0, 123, 255, 0.1);
  }

  .palette-piece-container:active {
    cursor: grabbing;
    transform: scale(0.95);
  }

  .palette-piece-container:focus {
    outline: 2px solid #007bff;
    outline-offset: 2px;
  }

  .piece-label {
    font-size: 0.65rem;
    color: var(--text-secondary, #666);
    text-align: center;
    line-height: 1.1;
    max-width: 55px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* When palettes are stacked horizontally */
  @media (max-width: 1000px) {
    .pieces-grid {
      grid-template-columns: repeat(6, 1fr);
      gap: 0.35rem;
    }

    .palette-piece-wrapper {
      gap: 0.08rem;
      padding: 0.12rem;
    }

    .palette-piece-container {
      width: clamp(35px, 8vw, 50px);
      height: clamp(35px, 8vw, 50px);
    }
  }

  @media (max-width: 768px) {
    .pieces-grid {
      grid-template-columns: repeat(5, 1fr);
      gap: 0.3rem;
    }

    .palette-piece-wrapper {
      gap: 0.06rem;
      padding: 0.1rem;
    }

    .palette-piece-container {
      width: clamp(32px, 10vw, 45px);
      height: clamp(32px, 10vw, 45px);
    }

    .piece-label {
      font-size: 0.6rem;
      max-width: clamp(40px, 10vw, 50px);
    }
  }

  @media (max-width: 480px) {
    .pieces-grid {
      grid-template-columns: repeat(4, 1fr);
      gap: 0.25rem;
    }

    .palette-piece-wrapper {
      gap: 0.05rem;
      padding: 0.08rem;
    }

    .palette-piece-container {
      width: clamp(30px, 12vw, 40px);
      height: clamp(30px, 12vw, 40px);
    }

    .piece-label {
      font-size: 0.55rem;
      max-width: clamp(35px, 12vw, 45px);
    }
  }

  @media (max-width: 360px) {
    .pieces-grid {
      grid-template-columns: repeat(3, 1fr);
      gap: 0.2rem;
    }

    .palette-piece-wrapper {
      gap: 0.04rem;
      padding: 0.06rem;
    }

    .palette-piece-container {
      width: clamp(28px, 15vw, 38px);
      height: clamp(28px, 15vw, 38px);
    }

    .piece-label {
      font-size: 0.5rem;
      max-width: clamp(30px, 15vw, 40px);
    }
  }
</style>
