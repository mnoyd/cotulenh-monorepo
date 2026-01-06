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

  let activeTab = $state<'red' | 'blue'>('red');
</script>

<div class="palettes-container">
  <!-- Mobile Tabs Header -->
  <div class="mobile-tabs lg:hidden">
    <button
      class="tab-btn red"
      class:active={activeTab === 'red'}
      onclick={() => (activeTab = 'red')}
    >
      🔴 Red Team
    </button>
    <button
      class="tab-btn blue"
      class:active={activeTab === 'blue'}
      onclick={() => (activeTab = 'blue')}
    >
      🔵 Blue Team
    </button>
  </div>

  <!-- Controls -->
  <div class="controls-wrapper">
    <PaletteControls
      {heroicMode}
      {editorMode}
      {onHandModeToggle}
      {onDeleteModeToggle}
      {onHeroicToggle}
    />
  </div>

  <!-- Red Palette -->
  <div class="palette-wrapper red-palette" class:hidden-mobile={activeTab !== 'red'}>
    <h3 class="palette-header red lg:block hidden">🔴 Red</h3>
    <div class="palette-content">
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

  <!-- Blue Palette -->
  <div class="palette-wrapper blue-palette" class:hidden-mobile={activeTab !== 'blue'}>
    <h3 class="palette-header blue lg:block hidden">🔵 Blue</h3>
    <div class="palette-content">
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
    height: 100%;
  }

  .palette-wrapper {
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 4px;
    padding: 0.5rem;
    display: flex;
    flex-direction: column;
    flex: 1; /* Take available space */
    min-height: 0;
  }

  .palette-content {
    overflow-y: auto;
    flex: 1;
    /* Custom scrollbar */
    scrollbar-width: thin;
    scrollbar-color: var(--color-mw-primary) rgba(0, 0, 0, 0.3);
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
    flex-shrink: 0;
  }

  .palette-header.red {
    color: #ff6b6b;
  }
  .palette-header.blue {
    color: #4dabf7;
  }

  /* Desktop Layout */
  @media (min-width: 1024px) {
    .controls-wrapper {
      order: 1;
    }
    .red-palette {
      order: 0;
    }
    .blue-palette {
      order: 2;
    }
  }

  /* Mobile Layout */
  @media (max-width: 1023px) {
    .palettes-container {
      gap: 0.5rem;
    }

    .mobile-tabs {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.5rem;
    }

    .tab-btn {
      padding: 0.5rem;
      background: rgba(0, 0, 0, 0.4);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 4px;
      color: #666;
      font-family: var(--font-display);
      font-weight: 600;
      text-transform: uppercase;
      font-size: 0.8rem;
      transition: all 0.2s;
    }

    .tab-btn.red.active {
      background: rgba(255, 107, 107, 0.1);
      border-color: #ff6b6b;
      color: #ff6b6b;
      box-shadow: 0 0 10px rgba(255, 107, 107, 0.2);
    }

    .tab-btn.blue.active {
      background: rgba(77, 171, 247, 0.1);
      border-color: #4dabf7;
      color: #4dabf7;
      box-shadow: 0 0 10px rgba(77, 171, 247, 0.2);
    }

    .palette-wrapper {
      background: transparent;
      border: none;
      padding: 0;
    }

    .hidden-mobile {
      display: none !important;
    }
  }
</style>
