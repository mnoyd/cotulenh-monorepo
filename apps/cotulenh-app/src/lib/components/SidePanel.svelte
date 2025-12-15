<script lang="ts">
  import type { CoTuLenh } from '@repo/cotulenh-core';
  import NewsPanel from './NewsPanel.svelte';
  // Imports will be swappable as we refactor them
  import GameInfo from './GameInfo.svelte';
  import DeploySessionPanel from './DeploySessionPanel.svelte';
  import GameControls from './GameControls.svelte';
  import MoveHistory from './MoveHistory.svelte';
  import { gameStore } from '$lib/stores/game';

  export let game: CoTuLenh | null;
  export let onCommit: () => void;
  export let onCancel: () => void;
  // Reactivity: Use gameStore to trigger updates when game state changes
  // We explicitly depend on $gameStore so that when it updates (after move), we re-fetch history from the game instance
  $: history = $gameStore && game ? game.history() : [];

  // Use store's deployState as the source of truth for UI visibility
  $: hasDeploySession = !!$gameStore.deployState;
</script>

<div class="side-panel">
  <!-- Top Bar: News / Status -->
  <div class="panel-header">
    <NewsPanel />
  </div>

  <!-- Main Content Container -->
  <div class="panel-body">
    <!-- Status HUD -->
    <div class="hud-section status-hud">
      <GameInfo />
    </div>

    <!-- Dynamic Center: Deploy OR History -->
    <div class="hud-section central-hud">
      {#if hasDeploySession}
        <DeploySessionPanel {game} {onCommit} {onCancel} />
      {:else}
        <MoveHistory {history} />
      {/if}
    </div>

    <!-- Bottom Controls -->
    <div class="hud-section controls-hud">
      <GameControls {game} />
    </div>
  </div>
</div>

<style>
  .side-panel {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
    height: 100%;
    max-height: 800px; /* limit height to match board roughly */
    font-family: var(--font-ui);
  }

  .panel-body {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
    flex-grow: 1;
    overflow-y: auto;
    padding-right: 4px; /* Space for scrollbar */
  }

  .hud-section {
    background: rgba(10, 15, 20, 0.85);
    border: 1px solid var(--mw-border-color);
    border-radius: 2px;
    position: relative;
    backdrop-filter: blur(4px);
  }

  /* Corner accents for HUD look */
  .hud-section::before,
  .hud-section::after {
    content: '';
    position: absolute;
    width: 8px;
    height: 8px;
    border-color: var(--mw-primary-dim);
    border-style: solid;
    transition: all 0.3s ease;
    pointer-events: none;
  }

  .hud-section::before {
    top: 0;
    left: 0;
    border-width: 1px 0 0 1px;
  }

  .hud-section::after {
    bottom: 0;
    right: 0;
    border-width: 0 1px 1px 0;
  }

  .status-hud {
    flex-shrink: 0;
  }

  .central-hud {
    flex-grow: 1;
    min-height: 200px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .controls-hud {
    flex-shrink: 0;
    padding: var(--spacing-sm);
  }

  /* Scrollbar for panel body */
  .panel-body::-webkit-scrollbar {
    width: 4px;
  }
  .panel-body::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.2);
  }
  .panel-body::-webkit-scrollbar-thumb {
    background: var(--mw-primary-dim);
  }
</style>
