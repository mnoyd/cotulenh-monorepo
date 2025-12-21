<script lang="ts">
  import { afterUpdate } from 'svelte';
  import { gameStore } from '$lib/stores/game';

  let historyContainer: HTMLDivElement;

  afterUpdate(() => {
    if (historyContainer) {
      historyContainer.scrollTop = historyContainer.scrollHeight;
    }
  });
</script>

<div class="history-mini">
  <div class="header">
    <span class="label">MISSION LOG</span>
  </div>

  <div class="history-content" bind:this={historyContainer}>
    {#if $gameStore.history.length === 0}
      <div class="empty-state">NO MOVES RECORDED</div>
    {:else}
      <div class="moves-list">
        {#each $gameStore.history as move, index}
          <button
            class="move-chip {index % 2 === 0 ? 'red-move' : 'blue-move'}"
            class:active={index === $gameStore.historyViewIndex}
            on:click={() => gameStore.previewMove(index)}
          >
            <span class="move-index">
              {(Math.floor(index / 2) + 1).toString().padStart(2, '0')}
            </span>
            <span class="move-san">{move.san}</span>
          </button>
        {/each}
      </div>
    {/if}
  </div>
</div>

<style>
  .history-mini {
    background: rgba(0, 0, 0, 0.4);
    border: 1px solid #333;
    display: flex;
    flex-direction: column;
    height: 100%; /* Fill available space */
    min-height: 150px; /* Minimum useful height */
    overflow: hidden; /* Prevent container-level scroll */
    box-shadow:
      0 4px 6px -1px rgba(0, 0, 0, 0.1),
      0 2px 4px -1px rgba(0, 0, 0, 0.06);
  }

  .header {
    background: #0f172a; /* Darker slate */
    padding: 6px 8px;
    border-bottom: 1px solid #333;
    display: flex;
    align-items: center;
  }

  .label {
    font-size: 0.65rem;
    font-weight: 700;
    color: #059669; /* Modern Warfare Green */
    letter-spacing: 2px;
    text-transform: uppercase;
  }

  .history-content {
    flex: 1;
    overflow-y: auto;
    padding: 8px;
    background: rgba(0, 0, 0, 0.2);
    font-family: 'Share Tech Mono', monospace;
  }

  /* Custom scrollbar */
  .history-content::-webkit-scrollbar {
    width: 4px;
  }
  .history-content::-webkit-scrollbar-track {
    background: #000;
  }
  .history-content::-webkit-scrollbar-thumb {
    background: #333;
    border-radius: 2px;
  }

  .empty-state {
    color: #555;
    font-size: 0.7rem;
    text-align: center;
    padding-top: 20px;
    font-style: italic;
    opacity: 0.7;
    letter-spacing: 0.5px;
  }

  .moves-list {
    display: flex;
    flex-wrap: wrap;
    align-content: flex-start;
    gap: 6px;
  }

  .move-chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 2px 6px;
    background: rgba(20, 20, 20, 0.8);
    border: 1px solid #333;
    font-size: 0.75rem;
    transition: all 0.2s ease;
    cursor: default;
    user-select: none;
    position: relative;
    overflow: hidden;
  }

  .move-chip::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    bottom: 0;
    width: 2px;
  }

  .move-chip:hover {
    background: rgba(40, 40, 40, 0.9);
    border-color: #555;
  }

  .move-index {
    color: #555;
    font-size: 0.6rem;
    letter-spacing: 0.5px;
  }

  .move-san {
    font-weight: 600;
    letter-spacing: 0.5px;
  }

  /* Red Theme */
  .red-move {
    /* Subtle red tint border or background can be added if desired, keeping it clean for now */
  }
  .red-move::before {
    background-color: #ef4444;
  }
  .red-move .move-san {
    color: #fca5a5; /* Lighter red for text readability */
  }

  /* Blue Theme */
  .blue-move {
  }
  .blue-move::before {
    background-color: #3b82f6;
  }
  .blue-move .move-san {
    color: #93c5fd; /* Lighter blue for text readability */
  }

  .move-chip.active {
    background: rgba(255, 255, 255, 0.15);
    border-color: #e5e5e5;
    box-shadow: 0 0 8px rgba(255, 255, 255, 0.2);
  }
</style>
