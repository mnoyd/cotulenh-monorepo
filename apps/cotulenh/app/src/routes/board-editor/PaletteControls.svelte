<script lang="ts">
  type EditorMode = 'hand' | 'drop' | 'delete';

  let {
    heroicMode = false,
    editorMode = 'hand',
    onHandModeToggle = () => {},
    onDeleteModeToggle = () => {},
    onHeroicToggle = () => {}
  }: {
    heroicMode: boolean;
    editorMode: EditorMode;
    onHandModeToggle: () => void;
    onDeleteModeToggle: () => void;
    onHeroicToggle: () => void;
  } = $props();
</script>

<div class="control-buttons max-lg:gap-1 max-lg:my-1 max-lg:p-1">
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
      onclick={(e) => {
        e.stopPropagation();
        onHeroicToggle();
      }}
      onkeydown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onHeroicToggle();
        }
      }}
    >
      <span class="control-emoji">⭐</span>
    </div>
    <span class="piece-label max-lg:hidden">Heroic</span>
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
      onclick={(e) => {
        e.stopPropagation();
        onHandModeToggle();
      }}
      onkeydown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onHandModeToggle();
        }
      }}
    >
      <span class="control-emoji">✋</span>
    </div>
    <span class="piece-label max-lg:hidden">Hand</span>
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
      onclick={(e) => {
        e.stopPropagation();
        onDeleteModeToggle();
      }}
      onkeydown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onDeleteModeToggle();
        }
      }}
    >
      <span class="control-emoji">🗑️</span>
    </div>
    <span class="piece-label max-lg:hidden">Delete</span>
  </div>
</div>

<style>
  .control-buttons {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.5rem;
    margin: 0.5rem 0;
    padding: 0.5rem;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 4px;
    border: 1px solid rgba(255, 255, 255, 0.05);
  }

  .control-button {
    flex: 1;
    cursor: pointer;
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

  .palette-piece-container {
    width: 36px;
    height: 36px;
    border: 2px solid transparent;
    border-radius: var(--radius-sm);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    filter: drop-shadow(0 0 5px rgba(0, 0, 0, 0.5));
  }

  .control-icon {
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

  /* Heroic Button Specifics */
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

  /* Delete Button Specifics */
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
    font-size: 18px;
    user-select: none;
    pointer-events: none;
  }

  .piece-label {
    font-size: 0.7rem;
    color: #a0a0a0;
    text-align: center;
    line-height: 1.1;
    font-family: var(--font-ui);
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .palette-piece-wrapper:hover .piece-label {
    color: #fff;
  }

  @media (width < 1024px) {
    .palette-piece-container {
      width: clamp(30px, 7vw, 40px);
      height: clamp(30px, 7vw, 40px);
    }
  }
</style>
