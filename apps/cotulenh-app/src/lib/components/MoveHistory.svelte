<script lang="ts">
  import { afterUpdate } from 'svelte';

  export let history: string[];

  let scrollContainer: HTMLElement;

  afterUpdate(() => {
    if (scrollContainer) {
      scrollContainer.scrollTop = scrollContainer.scrollHeight;
    }
  });
</script>

<div class="history-terminal">
  <div class="terminal-header">DATA LOG // MATCH HISTORY</div>
  <div class="terminal-body" bind:this={scrollContainer}>
    {#if history.length === 0}
      <div class="log-entry empty">
        <span class="prompt">></span> AWAITING TACTICAL MOVEMENT...
      </div>
    {:else}
      {#each history as move, i}
        <div class="log-row">
          <span class="index">{(Math.floor(i / 2) + 1).toString().padStart(3, '0')}:</span>
          <span class="move-content">
            <span class="prompt">></span>
            {move}
          </span>
        </div>
      {/each}
    {/if}
  </div>
</div>

<style>
  .history-terminal {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
    font-family: 'Courier New', monospace;
  }

  .terminal-header {
    background: rgba(255, 255, 255, 0.05);
    padding: 6px var(--spacing-sm);
    font-size: 0.7rem;
    font-weight: 700;
    color: var(--mw-text-muted);
    letter-spacing: 0.1em;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }

  .terminal-body {
    flex-grow: 1;
    overflow-y: auto;
    padding: var(--spacing-sm);
    font-size: 0.85rem;
    scrollbar-width: thin;
    scrollbar-color: var(--mw-primary-dim) transparent;
  }

  .terminal-body::-webkit-scrollbar {
    width: 4px;
  }
  .terminal-body::-webkit-scrollbar-thumb {
    background: var(--mw-primary-dim);
  }

  .log-row {
    display: grid;
    grid-template-columns: 40px 1fr;
    margin-bottom: 2px;
    color: var(--mw-text-secondary);
  }

  .log-row:last-child {
    color: var(--mw-primary);
    animation: flash 1s;
  }

  .index {
    color: var(--mw-text-dim);
    opacity: 0.5;
  }

  .prompt {
    color: var(--mw-secondary);
    margin-right: 4px;
  }

  .empty {
    color: var(--mw-text-dim);
    font-style: italic;
  }

  @keyframes flash {
    0% {
      background: rgba(255, 255, 255, 0.1);
    }
    100% {
      background: transparent;
    }
  }
</style>
