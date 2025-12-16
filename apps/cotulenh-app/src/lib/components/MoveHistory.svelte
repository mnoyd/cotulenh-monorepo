<script lang="ts">
  import { afterUpdate } from 'svelte';

  export let history: any[] = [];

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
    {#if history.length === 0}
      <div class="empty-state">NO MOVES RECORDED</div>
    {:else}
      <div class="moves-list">
        {#each history as move, index}
          {#if index % 2 === 0}
            <div class="move-row">
              <span class="move-num">{(index / 2 + 1).toString().padStart(2, '0')}</span>
              <span class="move-san red">{move.san}</span>
              {#if history[index + 1]}
                <span class="move-san blue">{history[index + 1].san}</span>
              {/if}
            </div>
          {/if}
        {/each}
      </div>
    {/if}
  </div>
</div>

<style>
  .history-mini {
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid #333;
    display: flex;
    flex-direction: column;
    height: 100%; /* Fill available space */
    min-height: 150px; /* Minimum useful height */
  }

  .header {
    background: #111;
    padding: 4px 8px;
    border-bottom: 1px solid #333;
  }

  .label {
    font-size: 0.7rem;
    font-weight: 700;
    color: #059669;
    letter-spacing: 1px;
  }

  .history-content {
    flex: 1;
    overflow-y: auto;
    padding: 4px;
    font-family: 'Share Tech Mono', monospace;
  }

  /* Custom scrollbar */
  .history-content::-webkit-scrollbar { width: 4px; }
  .history-content::-webkit-scrollbar-track { background: #000; }
  .history-content::-webkit-scrollbar-thumb { background: #333; }

  .empty-state {
    color: #444;
    font-size: 0.7rem;
    text-align: center;
    padding-top: 20px;
    font-style: italic;
  }

  .moves-list {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .move-row {
    display: flex;
    gap: 8px;
    font-size: 0.8rem;
    padding: 2px 4px;
  }

  .move-row:hover {
    background: rgba(255, 255, 255, 0.05);
  }

  .move-num {
    color: #555;
    width: 20px;
  }

  .move-san {
    width: 60px;
  }

  .move-san.red { color: #ef4444; }
  .move-san.blue { color: #3b82f6; }
</style>
