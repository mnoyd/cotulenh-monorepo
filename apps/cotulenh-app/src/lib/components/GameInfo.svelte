<script lang="ts">
  import { getTurnColorName } from '$lib/utils';
  import { gameStore } from '$lib/stores/game';
</script>

<div class="status-hud-content">
  {#if $gameStore.status === 'playing'}
    <div class="status-row">
      <div class="turn-indicator" class:red={$gameStore.turn === 'r'} class:blue={$gameStore.turn === 'b'}>
        <span class="label">TURN //</span>
        <span class="value">{$gameStore.turn ? getTurnColorName($gameStore.turn) : '...'}</span>
      </div>
      
      {#if $gameStore.check}
        <div class="warning-badge">
           WARNING: CHECK
        </div>
      {/if}
    </div>
  {:else}
    <div class="game-over-row">
      <span class="game-over-label">GAME OVER: </span>
      <span class="game-over-value">
        {#if $gameStore.status === 'checkmate'}
          CHECKMATE - {$gameStore.turn ? getTurnColorName($gameStore.turn === 'r' ? 'b' : 'r') : ''} WINS
        {:else if $gameStore.status === 'stalemate'}
          STALEMATE
        {:else if $gameStore.status === 'draw'}
          DRAW
        {/if}
      </span>
    </div>
  {/if}
</div>

<style>
  .status-hud-content {
    padding: var(--spacing-sm) var(--spacing-md);
    background: transparent;
  }

  .status-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--spacing-md);
  }

  .turn-indicator {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    font-family: var(--font-mono);
  }

  .label {
    color: var(--mw-text-muted);
    font-size: 0.8rem;
    font-weight: 700;
  }

  .value {
    font-size: 1rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .turn-indicator.red .value { color: var(--color-red-light); }
  .turn-indicator.blue .value { color: var(--color-blue-light); }

  .warning-badge {
    background: rgba(220, 38, 38, 0.2);
    color: var(--color-red-light);
    border: 1px solid rgba(220, 38, 38, 0.5);
    padding: 2px 8px;
    font-size: 0.75rem;
    font-weight: 700;
    animation: pulse 1s infinite alternate;
  }

  .game-over-row {
    font-family: var(--font-mono);
    text-align: center;
    color: var(--color-text-primary);
  }

  .game-over-label {
    color: var(--mw-primary);
    font-weight: 700;
  }
  
  .game-over-value {
    font-weight: 800;
    color: var(--color-success);
  }

  @keyframes pulse {
    from { opacity: 0.7; box-shadow: 0 0 5px rgba(220, 38, 38, 0.2); }
    to { opacity: 1; box-shadow: 0 0 15px rgba(220, 38, 38, 0.5); }
  }
</style>

