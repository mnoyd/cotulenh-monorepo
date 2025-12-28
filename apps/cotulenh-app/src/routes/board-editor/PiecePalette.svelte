<script lang="ts">
  import { logger } from '@repo/cotulenh-common';
  import type { Api, Piece, Role, Color } from '@repo/cotulenh-board';

  type EditorMode = 'hand' | 'drop' | 'delete';

  export let boardApi: Api | null = null;
  export let color: Color = 'red'; // Which color pieces to show
  export let onPieceSelect: (role: Role, color: Color) => void = () => {};
  export let selectedPiece: { role: Role; color: Color; promoted?: boolean } | null = null;
  export let heroicMode: boolean = false; // Whether pieces should be heroic (promoted)
  export let editorMode: EditorMode = 'hand'; // Current editor mode
  export let onHandModeToggle: () => void = () => {}; // Callback to toggle hand mode
  export let onDeleteModeToggle: () => void = () => {}; // Callback to toggle delete mode
  export let onHeroicToggle: () => void = () => {}; // Callback to toggle heroic mode

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

  // Create piece objects with proper state - promoted represents heroic in board terminology
  let pieces: Piece[] = [];

  // Initialize or update pieces based on color and heroicMode
  $: {
    pieces = roles.map((role) => ({
      role,
      color,
      promoted: heroicMode && role !== 'commander' ? true : undefined
    }));
  }

  function handlePieceDragStart(piece: Piece, event: MouseEvent | TouchEvent) {
    // Prevent default to avoid unwanted browser behaviors (text selection etc)
    if (event.cancelable) event.preventDefault();
    event.stopPropagation(); // Stop propagation to prevent body handlers (cancelSelection)

    if (!boardApi) return;

    // INTERACTION FIX: Select the piece immediately on mousedown/touch
    // This allows "Drop Mode" (click to select) and "Drag Mode" to coexist.
    // If we just click, this selects. If we drag, this selects AND drags.
    onPieceSelect(piece.role, piece.color);

    try {
      // Use the board's built-in dragNewPiece method with the actual piece object
      // force=true allows replacing existing pieces
      boardApi.dragNewPiece(piece, event as any, true);
      logger.debug(
        `Started dragging ${piece.color} ${piece.role}${piece.promoted ? ' (heroic)' : ''}`
      );
    } catch (error) {
      logger.error('Error starting drag:', error);
    }
  }

  function formatRoleName(role: Role): string {
    return role
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
</script>

<div class="palette-container">
  <!-- Control buttons: Heroic, Hand and Delete -->
  <div class="control-buttons">
    <!-- Heroic button -->
    <div
      class="palette-piece-wrapper control-button heroic-button"
      class:heroic-active={heroicMode}
      title="Toggle Heroic Mode"
    >
      <div
        class="palette-piece-container control-icon"
        role="button"
        tabindex="0"
        on:click={(e) => {
          e.stopPropagation();
          onHeroicToggle();
        }}
        on:keydown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onHeroicToggle();
          }
        }}
      >
        <span class="control-emoji">⭐</span>
      </div>
      <span class="piece-label">Heroic</span>
    </div>

    <!-- Hand button -->
    <div
      class="palette-piece-wrapper control-button"
      class:selected={editorMode === 'hand'}
      title="Hand Mode - Drag pieces on board"
    >
      <div
        class="palette-piece-container control-icon"
        role="button"
        tabindex="0"
        on:click={(e) => {
          e.stopPropagation();
          onHandModeToggle();
        }}
        on:keydown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onHandModeToggle();
          }
        }}
      >
        <span class="control-emoji">✋</span>
      </div>
      <span class="piece-label">Hand</span>
    </div>

    <!-- Delete button -->
    <div
      class="palette-piece-wrapper control-button"
      class:selected={editorMode === 'delete'}
      title="Delete Mode - Click pieces to delete"
    >
      <div
        class="palette-piece-container control-icon delete-icon"
        role="button"
        tabindex="0"
        on:click={(e) => {
          e.stopPropagation();
          onDeleteModeToggle();
        }}
        on:keydown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onDeleteModeToggle();
          }
        }}
      >
        <span class="control-emoji">🗑️</span>
      </div>
      <span class="piece-label">Delete</span>
    </div>
  </div>

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
        on:mousedown={(e) => handlePieceDragStart(piece, e)}
        on:touchstart={(e) => handlePieceDragStart(piece, e)}
        on:keydown={(e) => {
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
    height: 100%;
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

  /* Control buttons styles */
  .control-buttons {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.5rem;
    margin-bottom: 1rem;
    padding-bottom: 0.75rem;
    border-bottom: 1px dashed var(--mw-border-color);
  }

  .control-button {
    flex: 1;
    cursor: pointer;
  }

  .control-button .control-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: rgba(255, 255, 255, 0.05);
    border: 1px solid var(--mw-border-color);
  }

  .control-button:hover .control-icon {
    background-color: rgba(255, 255, 255, 0.15);
    border-color: #fff;
  }

  .control-button.selected .control-icon {
    background-color: rgba(0, 243, 255, 0.2);
    border-color: var(--mw-primary);
    box-shadow: 0 0 10px var(--mw-primary-dim);
  }

  .control-button.selected .piece-label {
    color: var(--mw-primary);
  }

  .heroic-button .control-icon {
    border-color: var(--mw-warning);
    background: rgba(255, 215, 0, 0.05);
  }

  .heroic-button:hover .control-icon {
    background: rgba(255, 215, 0, 0.15);
    box-shadow: 0 0 10px rgba(255, 215, 0, 0.3);
  }

  .heroic-button.heroic-active .control-icon {
    background-color: rgba(255, 215, 0, 0.25);
    border-color: var(--mw-warning);
    box-shadow: 0 0 15px rgba(255, 215, 0, 0.4);
  }

  .heroic-button.heroic-active .piece-label {
    color: var(--mw-warning);
  }

  .heroic-button .control-icon:active {
    transform: scale(0.95);
  }

  .delete-icon.control-icon {
    border-color: var(--mw-alert);
    background: rgba(255, 80, 0, 0.05);
  }

  .delete-icon.control-icon:hover {
    background-color: rgba(255, 80, 0, 0.15);
    box-shadow: 0 0 10px rgba(255, 80, 0, 0.3);
  }

  .control-button.selected .delete-icon {
    background-color: rgba(255, 80, 0, 0.3);
    border-color: var(--mw-alert);
    box-shadow: 0 0 15px rgba(255, 80, 0, 0.4);
  }

  .control-button.selected:has(.delete-icon) .piece-label {
    color: var(--mw-alert);
  }

  .control-emoji {
    font-size: 20px;
    user-select: none;
    pointer-events: none;
    filter: drop-shadow(0 0 5px rgba(0, 0, 0, 0.5));
  }

  /* When palettes are stacked horizontally/responsive */
  /* When palettes are stacked horizontally/responsive */
  @media (max-width: 1024px) {
    .control-buttons {
      gap: 0.25rem;
      margin-bottom: 0.25rem;
      padding-bottom: 0.25rem;
    }

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
