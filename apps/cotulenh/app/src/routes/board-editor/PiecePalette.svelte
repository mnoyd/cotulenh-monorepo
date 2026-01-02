<script lang="ts">
  import { logger } from '@cotulenh/common';
  import type { Api, Piece, Role, Color } from '@cotulenh/board';

  type EditorMode = 'hand' | 'drop' | 'delete';

  let {
    boardApi = null,
    color = 'red',
    onPieceSelect = () => {},
    selectedPiece = null,
    heroicMode = false,
    compact = false
  }: {
    boardApi: Api | null;
    color: Color;
    onPieceSelect: (role: Role, color: Color) => void;
    selectedPiece: { role: Role; color: Color; promoted?: boolean } | null;
    heroicMode: boolean;
    compact: boolean;
  } = $props();

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
    'headquarter'
  ];

  // Create piece objects with proper state
  let pieces = $derived(
    roles.map((role) => ({
      role,
      color,
      promoted: heroicMode && role !== 'commander' ? true : undefined
    }))
  );

  function handlePieceDragStart(piece: Piece, event: MouseEvent | TouchEvent) {
    if (event.cancelable) event.preventDefault();
    event.stopPropagation();

    // Check raw prop just to be safe, though local var should work
    if (!boardApi) {
      logger.warn('PiecePalette: boardApi is null, cannot drag');
      return;
    }

    onPieceSelect(piece.role, piece.color);

    try {
      boardApi.dragNewPiece(piece, event as any, true);
      logger.debug(
        `Started dragging ${piece.color} ${piece.role}${piece.promoted ? ' (heroic)' : ''}`
      );
    } catch (error) {
      logger.error(error, 'Error starting drag:');
    }
  }

  function formatRoleName(role: Role): string {
    return role
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
</script>

<div class="palette-container" class:compact>
  <div class="pieces-grid">
    {#each pieces as piece}
      <div
        class="palette-piece-wrapper"
        class:selected={selectedPiece?.role === piece.role &&
          selectedPiece?.color === piece.color &&
          selectedPiece?.promoted === piece.promoted}
        title={formatRoleName(piece.role)}
        role="button"
        tabindex="0"
        onmousedown={(e) => handlePieceDragStart(piece, e)}
        ontouchstart={(e) => handlePieceDragStart(piece, e)}
        onkeydown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onPieceSelect(piece.role, piece.color);
          }
        }}
      >
        <div class="cg-wrap palette-piece-container">
          <piece class="{piece.role} {piece.color}" class:heroic={piece.promoted}>
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

  /* Compact mode for sidebar */
  .palette-container.compact .pieces-grid {
    grid-template-columns: repeat(4, 1fr);
    gap: 0.25rem;
    padding: 0;
  }

  .palette-container.compact .palette-piece-wrapper {
    padding: 0.25rem;
    gap: 0;
  }

  .palette-container.compact .palette-piece-container {
    width: 36px;
    height: 36px;
  }

  .palette-container.compact .piece-label {
    display: none;
  }

  .pieces-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.5rem;
    padding: 0.25rem;
    flex: 1;
  }

  .palette-piece-wrapper {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
    padding: 0.5rem;
    border-radius: var(--radius-sm);
    transition: all 0.2s;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid transparent;
  }

  .palette-piece-wrapper:hover {
    background: rgba(0, 243, 255, 0.1);
    border-color: rgba(0, 243, 255, 0.3);
  }

  .palette-piece-wrapper.selected {
    background-color: rgba(0, 243, 255, 0.15);
    box-shadow: inset 0 0 15px rgba(0, 243, 255, 0.2);
    border: 1px solid var(--mw-primary);
  }

  .palette-piece-container {
    width: 50px;
    height: 50px;
    border: 2px solid transparent;
    border-radius: var(--radius-sm);
    cursor: grab;
    transition: all 0.2s ease;
    position: relative;
    filter: drop-shadow(0 0 5px rgba(0, 0, 0, 0.5));
  }

  /* Piece images come from commander-chess.pieces.css */
  .palette-piece-container piece {
    display: block;
    width: 100%;
    height: 100%;
    background-size: 85% 85%;
    background-repeat: no-repeat;
    background-position: center;
    pointer-events: none;
  }

  .palette-piece-container:hover {
    transform: scale(1.1);
    filter: drop-shadow(0 0 8px var(--mw-primary));
  }

  .palette-piece-wrapper.selected .palette-piece-container {
    filter: drop-shadow(0 0 10px var(--mw-primary));
  }

  .palette-piece-container:active {
    cursor: grabbing;
    transform: scale(0.95);
  }

  .piece-label {
    font-size: 0.7rem;
    color: #a0a0a0;
    text-align: center;
    line-height: 1.1;
    max-width: 60px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-family: var(--font-ui);
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .palette-piece-wrapper:hover .piece-label {
    color: #fff;
  }

  .palette-piece-wrapper.selected .piece-label {
    color: var(--mw-primary);
    text-shadow: 0 0 5px var(--mw-primary-dim);
  }

  /* When palettes are stacked horizontally/responsive */
  @media (max-width: 1024px) {
    .pieces-grid {
      /* Fit all 11 pieces in 2 rows (6 columns) */
      grid-template-columns: repeat(6, 1fr);
      gap: 0.25rem;
      padding: 0;
    }

    .palette-piece-wrapper {
      padding: 0.15rem;
      gap: 0;
      background: transparent; /* Remove heavy background to look cleaner */
    }

    .palette-piece-wrapper.selected {
      background-color: rgba(0, 243, 255, 0.15);
    }

    .palette-piece-container {
      width: clamp(30px, 7vw, 40px);
      height: clamp(30px, 7vw, 40px);
    }

    /* Hide labels on mobile to save massive separate vert space */
    .piece-label {
      display: none;
    }

    /* Show label only for selected item if needed, or just rely on icon */
    .palette-piece-wrapper.selected .piece-label {
      display: block;
      font-size: 0.5rem;
      position: absolute;
      bottom: -10px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 0, 0, 0.8);
      padding: 1px 4px;
      z-index: 10;
      border-radius: 2px;
      width: auto;
      max-width: none;
    }
  }
</style>
