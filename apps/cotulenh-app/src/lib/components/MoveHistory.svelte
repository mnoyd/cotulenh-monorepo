<script lang="ts">
  import { afterUpdate } from 'svelte';

  // Prop received from parent component - using any to avoid type issues for now
  export let history: any[] = [];

  let historyContainer: HTMLDivElement;

  // Scroll to the bottom whenever the history updates
  afterUpdate(() => {
    if (historyContainer) {
      historyContainer.scrollTop = historyContainer.scrollHeight;
    }
  });
</script>

<div class="move-history-wrapper">
  <div class="history-header">
    <svg class="history-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M9 5H7C5.89543 5 5 5.89543 5 7V19C5 20.1046 5.89543 21 7 21H17C18.1046 21 19 20.1046 19 19V7C19 5.89543 18.1046 5 17 5H15"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <rect x="9" y="3" width="6" height="4" rx="1" stroke="currentColor" stroke-width="2" />
      <path d="M9 12H15M9 16H15" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
    </svg>
    <h4>Move History</h4>
  </div>

  <div class="history-content" bind:this={historyContainer}>
    {#if history.length === 0}
      <div class="empty-state">
        <svg class="empty-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" />
          <path d="M12 8V12L15 15" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
        </svg>
        <p>No moves yet</p>
      </div>
    {:else}
      <div class="moves-grid">
        {#each history as move, index}
          {#if index % 2 === 0}
            <div class="move-row">
              <div class="move-number">{Math.floor(index / 2) + 1}</div>
              <div class="move-pair">
                <div class="move-cell red">{move.san}</div>
                {#if history[index + 1]}
                  <div class="move-cell blue">{history[index + 1].san}</div>
                {:else}
                  <div class="move-cell empty">—</div>
                {/if}
              </div>
            </div>
          {/if}
        {/each}
      </div>
    {/if}
  </div>
</div>

<style>
  .move-history-wrapper {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    overflow: hidden;
    box-shadow: var(--shadow-md);
    display: flex;
    flex-direction: column;
  }

  .history-header {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-md) var(--spacing-lg);
    background: linear-gradient(135deg, rgba(37, 99, 235, 0.1), rgba(124, 58, 237, 0.1));
    border-bottom: 1px solid var(--color-border);
  }

  .history-icon {
    width: 20px;
    height: 20px;
    color: var(--color-primary);
    stroke-width: 2;
  }

  .history-header h4 {
    font-size: 1.1rem;
    font-weight: 600;
    color: var(--color-text-primary);
    margin: 0;
  }

  .history-content {
    padding: var(--spacing-sm);
    max-height: 400px;
    overflow-y: auto;
  }

  .history-content::-webkit-scrollbar {
    width: 6px;
  }

  .history-content::-webkit-scrollbar-track {
    background: var(--color-bg-secondary);
    border-radius: 3px;
  }

  .history-content::-webkit-scrollbar-thumb {
    background: var(--color-border);
    border-radius: 3px;
  }

  .history-content::-webkit-scrollbar-thumb:hover {
    background: var(--color-border-light);
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-xl) var(--spacing-md);
    color: var(--color-text-tertiary);
  }

  .empty-icon {
    width: 48px;
    height: 48px;
    opacity: 0.5;
    stroke-width: 1.5;
  }

  .empty-state p {
    margin: 0;
    font-size: 0.9rem;
    font-style: italic;
  }

  .moves-grid {
    display: flex;
    flex-wrap: wrap; /* Allow wrapping */
    align-items: center; /* Vertically align items */
    column-gap: 12px; /* Space between move pairs */
    row-gap: 6px; /* Space between lines */
    padding: 4px;
  }

  .move-row {
    display: flex; /* Change from grid to flex */
    align-items: center;
    padding: 2px 0;
    /* Removed border-bottom as it looks weird in flow layout */
  }

  .move-number {
    font-family: 'Courier New', monospace;
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--color-text-tertiary);
    margin-right: 4px; /* separation */
  }

  .move-pair {
    display: flex;
    gap: 6px;
    align-items: center;
  }

  .move-cell {
    font-family: 'Courier New', monospace;
    font-size: 0.85rem;
    font-weight: 600;
    padding: 2px 5px; /* Slightly tighter padding */
    border-radius: var(--radius-sm);
    transition: all var(--transition-fast);
    white-space: nowrap;
    display: inline-block;
    min-width: fit-content;
  }

  .move-cell.red {
    background: rgba(220, 38, 38, 0.15);
    color: var(--color-red-light);
    border: 1px solid rgba(220, 38, 38, 0.3);
  }

  .move-cell.blue {
    background: rgba(59, 130, 246, 0.2);
    color: var(--color-blue-light);
    border: 1px solid rgba(59, 130, 246, 0.4);
  }

  .move-cell.empty {
    background: transparent;
    color: var(--color-text-muted);
    border: 1px solid transparent;
    opacity: 0.5;
  }

  .move-cell.red:hover,
  .move-cell.blue:hover {
    transform: translateY(-1px);
    box-shadow: var(--shadow-sm);
  }

  @media (max-width: 768px) {
    .history-header {
      padding: var(--spacing-sm) var(--spacing-md);
    }

    .history-content {
      padding: var(--spacing-sm);
    }

    /* On mobile, we might want fewer gaps or smaller text */
    .moves-grid {
      column-gap: 8px;
    }

    .move-number {
      font-size: 0.85rem;
    }

    .move-cell {
      font-size: 0.875rem;
      padding: 2px 4px;
    }
  }
</style>
