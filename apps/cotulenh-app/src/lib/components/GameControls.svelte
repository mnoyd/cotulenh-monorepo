<script lang="ts">
  import { CoTuLenh } from '@repo/cotulenh-core';
  import { gameStore } from '$lib/stores/game';

  export let game: CoTuLenh | null = null;

  function resetGame() {
    if (!game) return;

    // Create a new game instance with the default position
    game = new CoTuLenh();

    // Initialize the store with the new game
    gameStore.initialize(game);

    console.log('Game reset to initial position');
  }
</script>

<div class="game-controls">
  <h3>Game Controls</h3>

  <div class="controls-container">
    <button class="control-button reset-button" on:click={resetGame}>
      <span class="icon">↺</span>
      Reset Game
    </button>

    <!-- Additional controls can be added here in the future -->
    <!-- For example: Undo move, Set custom position, etc. -->
  </div>
</div>

<style>
  .game-controls {
    background: var(--surface-2, #f0f0f0);
    padding: 1rem;
    border-radius: 8px;
    margin-top: 1rem;
  }

  h3 {
    margin-top: 0;
    color: var(--text-primary, #333);
  }

  .controls-container {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    margin-top: 0.5rem;
  }

  .control-button {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    border-radius: 4px;
    font-weight: bold;
    cursor: pointer;
    transition:
      background-color 0.2s ease,
      transform 0.1s ease;
    border: none;
  }

  .control-button:hover {
    transform: translateY(-1px);
  }

  .control-button:active {
    transform: translateY(1px);
  }

  .reset-button {
    background-color: var(--primary-color, #4a6fa5);
    color: white;
  }

  .reset-button:hover {
    background-color: var(--primary-hover, #3a5985);
  }

  .icon {
    font-size: 1.2rem;
  }
</style>
