<script lang="ts">
  import type { Api, Role, Color } from '@cotulenh/board';
  import PiecePalette from './PiecePalette.svelte';
  import PaletteControls from './PaletteControls.svelte';

  type EditorMode = 'hand' | 'drop' | 'delete';

  let {
    boardApi,
    selectedPiece,
    heroicMode,
    editorMode,
    onPieceSelect,
    onHandModeToggle,
    onDeleteModeToggle,
    onHeroicToggle
  }: {
    boardApi: Api | null;
    selectedPiece: { role: Role; color: Color; promoted?: boolean } | null;
    heroicMode: boolean;
    editorMode: EditorMode;
    onPieceSelect: (role: Role, color: Color) => void;
    onHandModeToggle: () => void;
    onDeleteModeToggle: () => void;
    onHeroicToggle: () => void;
  } = $props();
</script>

<div class="palettes-container">
  <!-- Controls first on mobile, between palettes on desktop -->
  <div class="controls-wrapper">
    <PaletteControls
      {heroicMode}
      {editorMode}
      {onHandModeToggle}
      {onDeleteModeToggle}
      {onHeroicToggle}
    />
  </div>

  <!-- Red Palette - horizontally scrollable on mobile -->
  <div class="palette-wrapper red-palette">
    <h3 class="palette-header red">🔴 Red</h3>
    <div class="palette-scroll-container">
      <PiecePalette
        {boardApi}
        color="red"
        {onPieceSelect}
        {selectedPiece}
        {heroicMode}
        compact={true}
      />
    </div>
  </div>

  <!-- Blue Palette - horizontally scrollable on mobile -->
  <div class="palette-wrapper blue-palette">
    <h3 class="palette-header blue">🔵 Blue</h3>
    <div class="palette-scroll-container">
      <PiecePalette
        {boardApi}
        color="blue"
        {onPieceSelect}
        {selectedPiece}
        {heroicMode}
        compact={true}
      />
    </div>
  </div>
</div>

<style>
  .palettes-container {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .controls-wrapper {
    /* Default order for desktop - controls in middle */
  }

  .palette-wrapper {
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 4px;
    padding: 0.5rem;
    display: flex;
    flex-direction: column;
  }

  .palette-scroll-container {
    /* Desktop: vertical scroll if needed */
    overflow-y: auto;
    flex: 1;
  }

  .palette-header {
    font-family: var(--font-display);
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin: 0 0 0.5rem 0;
    padding-bottom: 0.25rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    display: block;
    flex-shrink: 0;
  }

  .palette-header.red {
    color: #ff6b6b;
  }

  .palette-header.blue {
    color: #4dabf7;
  }

  /* Desktop: Controls between palettes */
  .controls-wrapper {
    order: 1;
  }

  .red-palette {
    order: 0;
  }

  .blue-palette {
    order: 2;
  }

  /* Mobile/Tablet Styles */
  @media (max-width: 1024px) {
    .palettes-container {
      gap: 0.5rem;
      /* No scrolling on the container itself */
      overflow: visible;
    }

    /* Controls first on mobile */
    .controls-wrapper {
      order: -1;
      flex-shrink: 0;
    }

    .palette-wrapper {
      /* Compact styling for mobile */
      padding: 0.25rem 0.5rem;
      flex-shrink: 0;
      /* Fixed height for horizontal scroll area */
      max-height: 80px;
    }

    .palette-header {
      font-size: 0.65rem;
      margin-bottom: 0.25rem;
      padding-bottom: 0.15rem;
    }

    /* Enable horizontal scroll on mobile */
    .palette-scroll-container {
      overflow-x: auto;
      overflow-y: visible;
      /* Horizontal scroll with momentum */
      scroll-snap-type: x mandatory;
      -webkit-overflow-scrolling: touch;
      /* Prevent vertical scroll interference */
      touch-action: pan-x;
      /* Hide scrollbar but keep functionality */
      scrollbar-width: none;
      -ms-overflow-style: none;
    }

    .palette-scroll-container::-webkit-scrollbar {
      display: none;
    }
  }
</style>
