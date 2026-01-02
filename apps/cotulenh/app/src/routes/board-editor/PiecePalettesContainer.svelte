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

  let activeTab: 'red' | 'blue' = $state('red');

  function switchTab(color: 'red' | 'blue') {
    activeTab = color;
  }
</script>

<div class="palettes-container">
  <!-- Mobile Tabs -->
  <div class="palette-tabs">
    <button
      class="tab-btn red"
      class:active={activeTab === 'red'}
      onclick={() => switchTab('red')}
      title="Show Red Army"
    >
      🔴 Red Army
    </button>
    <button
      class="tab-btn blue"
      class:active={activeTab === 'blue'}
      onclick={() => switchTab('blue')}
      title="Show Blue Army"
    >
      🔵 Blue Army
    </button>
  </div>

  <!-- Red Palette -->
  <div class="palette-wrapper" class:visible={activeTab === 'red'}>
    <h3 class="palette-header red">🔴 Red Army</h3>
    <PiecePalette
      {boardApi}
      color="red"
      {onPieceSelect}
      {selectedPiece}
      {heroicMode}
      compact={true}
    />
  </div>

  <!-- Shared Controls placed between palettes on desktop, or consistently visible on mobile -->
  <div class="controls-wrapper">
    <PaletteControls
      {heroicMode}
      {editorMode}
      {onHandModeToggle}
      {onDeleteModeToggle}
      {onHeroicToggle}
    />
  </div>

  <!-- Blue Palette -->
  <div class="palette-wrapper" class:visible={activeTab === 'blue'}>
    <h3 class="palette-header blue">🔵 Blue Army</h3>
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
    display: flex; /* Always flex on desktop */
    flex-direction: column;
    overflow-y: auto;
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
    display: block; /* Show header on desktop */
  }

  .palette-header.red {
    color: #ff6b6b;
  }
  .palette-header.blue {
    color: #4dabf7;
  }

  /* Tabs are hidden by default (Desktop) */
  .palette-tabs {
    display: none;
  }

  /* Mobile/Tablet Styles */
  @media (max-width: 1024px) {
    .palettes-container {
      gap: 0.5rem;
    }

    .palette-tabs {
      display: flex;
      gap: 0;
      background: rgba(0, 0, 0, 0.2);
      border-radius: 6px;
      padding: 4px;
      margin-bottom: 0.5rem;
    }

    .tab-btn {
      flex: 1;
      padding: 0.5rem;
      border: none;
      background: transparent;
      color: var(--color-mw-text-muted);
      font-family: var(--font-ui);
      font-weight: 600;
      font-size: 0.8rem;
      text-transform: uppercase;
      cursor: pointer;
      border-radius: 4px;
      transition: all 0.2s;
    }

    .tab-btn.active.red {
      background: rgba(255, 107, 107, 0.2);
      color: #ff6b6b;
      box-shadow: 0 0 10px rgba(255, 107, 107, 0.1);
    }

    .tab-btn.active.blue {
      background: rgba(77, 171, 247, 0.2);
      color: #4dabf7;
      box-shadow: 0 0 10px rgba(77, 171, 247, 0.1);
    }

    /* Hide palette headers on mobile since we have tabs */
    .palette-header {
      display: none;
    }

    .palette-wrapper {
      display: none; /* Hidden by default on mobile */
      border: none;
      background: transparent;
      padding: 0;
    }

    .palette-wrapper.visible {
      display: flex; /* Show only active tab */
    }

    .controls-wrapper {
      order: 10; /* Ensure controls are always at the bottom on mobile */
      margin-top: 0.5rem;
    }
  }
</style>
