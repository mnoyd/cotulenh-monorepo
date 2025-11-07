<script lang="ts">
  import MoveHistory from './MoveHistory.svelte';
  import { getTurnColorName } from '$lib/utils';
  import { gameStore } from '$lib/stores/game';
</script>

<div class="game-info-card">
  <div class="card-header">
    <h3>Game Status</h3>
  </div>

  <div class="status-section">
    {#if $gameStore.status === 'playing'}
      <div class="turn-indicator">
        <div class="turn-label">Current Turn</div>
        <div class="turn-value" class:red={$gameStore.turn === 'r'} class:blue={$gameStore.turn === 'b'}>
          {$gameStore.turn ? getTurnColorName($gameStore.turn) : '...'}
        </div>
        {#if $gameStore.check}
          <div class="check-badge">
            <svg class="check-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 9V13M12 17H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span>Check!</span>
          </div>
        {/if}
      </div>
    {:else}
      <div class="game-over-state">
        <div class="game-over-icon">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <div class="game-over-text">
          <div class="game-over-title">Game Over</div>
          <div class="game-over-message">
            {#if $gameStore.status === 'checkmate'}
              Checkmate! {$gameStore.turn
                ? getTurnColorName($gameStore.turn === 'r' ? 'b' : 'r')
                : ''} wins!
            {:else if $gameStore.status === 'stalemate'}
              Stalemate!
            {:else if $gameStore.status === 'draw'}
              Draw!
            {/if}
          </div>
        </div>
      </div>
    {/if}
  </div>

  <MoveHistory history={$gameStore.history} />
</div>

<style>
  .game-info-card {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    overflow: hidden;
    box-shadow: var(--shadow-md);
    transition: box-shadow var(--transition-base);
  }

  .game-info-card:hover {
    box-shadow: var(--shadow-lg);
  }

  .card-header {
    padding: var(--spacing-md) var(--spacing-lg);
    background: linear-gradient(135deg, rgba(37, 99, 235, 0.1), rgba(124, 58, 237, 0.1));
    border-bottom: 1px solid var(--color-border);
  }

  .card-header h3 {
    font-size: 1.1rem;
    font-weight: 600;
    color: var(--color-text-primary);
    margin: 0;
  }

  .status-section {
    padding: var(--spacing-lg);
  }

  .turn-indicator {
    text-align: center;
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
  }

  .turn-label {
    font-size: 0.875rem;
    color: var(--color-text-secondary);
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .turn-value {
    font-size: 1.75rem;
    font-weight: 700;
    padding: var(--spacing-sm) var(--spacing-lg);
    border-radius: var(--radius-md);
    transition: all var(--transition-base);
  }

  .turn-value.red {
    color: var(--color-red-light);
    background: rgba(220, 38, 38, 0.1);
    border: 2px solid rgba(220, 38, 38, 0.3);
  }

  .turn-value.blue {
    color: var(--color-blue-light);
    background: rgba(37, 99, 235, 0.1);
    border: 2px solid rgba(37, 99, 235, 0.3);
  }

  .check-badge {
    display: inline-flex;
    align-items: center;
    gap: var(--spacing-xs);
    padding: var(--spacing-xs) var(--spacing-md);
    background: rgba(239, 68, 68, 0.15);
    border: 1px solid var(--color-error);
    border-radius: var(--radius-md);
    color: var(--color-error);
    font-weight: 600;
    font-size: 0.9rem;
    margin: 0 auto;
    animation: pulse 2s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
  }

  .check-icon {
    width: 18px;
    height: 18px;
    stroke-width: 2.5;
  }

  .game-over-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-md);
    text-align: center;
  }

  .game-over-icon {
    width: 64px;
    height: 64px;
    color: var(--color-success);
    filter: drop-shadow(0 0 12px rgba(16, 185, 129, 0.4));
  }

  .game-over-icon svg {
    width: 100%;
    height: 100%;
    stroke-width: 2;
  }

  .game-over-title {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--color-text-primary);
    margin-bottom: var(--spacing-xs);
  }

  .game-over-message {
    font-size: 1.1rem;
    color: var(--color-text-secondary);
    font-weight: 500;
  }

  @media (max-width: 768px) {
    .card-header {
      padding: var(--spacing-sm) var(--spacing-md);
    }

    .status-section {
      padding: var(--spacing-md);
    }

    .turn-value {
      font-size: 1.5rem;
    }

    .game-over-icon {
      width: 52px;
      height: 52px;
    }

    .game-over-title {
      font-size: 1.25rem;
    }
  }
</style>
