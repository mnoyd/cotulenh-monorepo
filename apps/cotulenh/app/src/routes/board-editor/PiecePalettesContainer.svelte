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

<div class="palettes-container max-lg:gap-2 max-lg:overflow-visible">
  <!-- Controls first on mobile, between palettes on desktop -->
  <div class="controls-wrapper max-lg:-order-1 max-lg:flex-shrink-0">
    <PaletteControls
      {heroicMode}
      {editorMode}
      {onHandModeToggle}
      {onDeleteModeToggle}
      {onHeroicToggle}
    />
  </div>

  <!-- Red Palette - horizontally scrollable on mobile -->
  <div class="palette-wrapper red-palette max-lg:py-1 max-lg:px-2 max-lg:flex-shrink-0 max-lg:max-h-20">
    <h3 class="palette-header red max-lg:text-[0.65rem] max-lg:mb-1 max-lg:pb-0.5">🔴 Red</h3>
    <div class="palette-scroll-container max-lg:overflow-x-auto max-lg:overflow-y-visible max-lg:snap-x max-lg:snap-mandatory max-lg:touch-pan-x max-lg:scrollbar-none">
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
  <div class="palette-wrapper blue-palette max-lg:py-1 max-lg:px-2 max-lg:flex-shrink-0 max-lg:max-h-20">
    <h3 class="palette-header blue max-lg:text-[0.65rem] max-lg:mb-1 max-lg:pb-0.5">🔵 Blue</h3>
    <div class="palette-scroll-container max-lg:overflow-x-auto max-lg:overflow-y-visible max-lg:snap-x max-lg:snap-mandatory max-lg:touch-pan-x max-lg:scrollbar-none">
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
    /* Default order for desktop - controls in middle */
    order: 1;
  }

  .red-palette {
    order: 0;
  }

  .blue-palette {
    order: 2;
  }
</style>
