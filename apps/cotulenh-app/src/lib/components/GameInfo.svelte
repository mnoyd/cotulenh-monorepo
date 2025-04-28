<script lang="ts">
  import MoveHistory from './MoveHistory.svelte';
  import { getTurnColorName } from '$lib/utils'; // Import helper
  import { gameStore } from '$lib/stores/game'; // Import the game store

  // Remove props - component will read directly from the store
  // export let turn: Color | null;
  // export let history: Move[];
  // export let gameStatus: string | null = null; // Remove if not used or handle via store
</script>

<div class="game-info-panel">
  <div class="status-section">
    {#if $gameStore.status === 'playing'}
      <div class="turn-indicator">
        Current Turn:
        <strong>{$gameStore.turn ? getTurnColorName($gameStore.turn) : '...'}</strong>
        {#if $gameStore.check}<span class="check-indicator"> (Check)</span>{/if}
      </div>
    {:else}
      <div class="game-over-indicator">
        <strong>Game Over</strong>
        <div class="status-message">
          {#if $gameStore.status === 'checkmate'}
            Checkmate! {$gameStore.turn
              ? getTurnColorName($gameStore.turn === 'r' ? 'b' : 'r')
              : ''} wins!
          {:else if $gameStore.status === 'stalemate'}
            Stalemate!
          {:else if $gameStore.status === 'draw'}
            Draw!
            <!-- Add other draw conditions if implemented in store -->
          {/if}
        </div>
      </div>
    {/if}
  </div>

  <MoveHistory history={$gameStore.history} />
</div>

<style>
  .game-info-panel {
    background: var(--surface-2, #f0f0f0);
    padding: 1rem;
    border-radius: 8px;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    height: fit-content; /* Prevent stretching */
  }

  .status-section {
    text-align: center;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid var(--surface-3, #e0e0e0);
  }

  .turn-indicator,
  .game-over-indicator {
    font-size: 1.1em;
    color: var(--text-primary, #333);
  }

  .turn-indicator strong,
  .game-over-indicator strong {
    color: var(--text-emphasis, #000);
  }

  .check-indicator {
    color: var(--text-warning, red);
    font-weight: bold;
    margin-left: 0.5em;
  }

  .game-over-indicator {
    color: var(--text-accent, blue);
  }

  .status-message {
    font-size: 1em;
    margin-top: 0.25rem;
    color: var(--text-secondary, #555);
  }

  /* Ensure MoveHistory takes remaining space if needed, or adjust styling */
</style>
