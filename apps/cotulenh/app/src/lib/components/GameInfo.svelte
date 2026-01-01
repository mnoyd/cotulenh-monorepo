<script lang="ts">
  import { getTurnColorName } from '$lib/utils';
  import { gameState } from '$lib/stores/game.svelte';
  import * as Alert from '$lib/components/ui/alert';
  import AlertDescription from '$lib/components/ui/alert/alert-description.svelte';
  import AlertTitle from '$lib/components/ui/alert/alert-title.svelte';

  // Use $derived to create reactive values from gameState
  let turn = $derived(gameState.turn);
  let check = $derived(gameState.check);
  let status = $derived(gameState.status);
</script>

<div class="game-info-mini">
  <div class="status-row">
    <div class="turn-badge" class:red={turn === 'r'} class:blue={turn === 'b'}>
      <span class="label">TURN</span>
      <span class="value">{turn ? getTurnColorName(turn) : '...'}</span>
    </div>
  </div>

  {#if check}
    <Alert.Root variant="destructive" class="check-alert">
      <AlertTitle>⚠️ CHECK!</AlertTitle>
      <AlertDescription>
        {turn ? getTurnColorName(turn) : 'Enemy'}'s commander is under attack
      </AlertDescription>
    </Alert.Root>
  {/if}

  {#if status !== 'playing'}
    <Alert.Root class="game-over-alert">
      <AlertTitle>
        {status === 'checkmate' ? '🏆 CHECKMATE!' : status.toUpperCase()}
      </AlertTitle>
      <AlertDescription>
        Game over. {status === 'checkmate' ? 'Victory!' : 'Draw.'}
      </AlertDescription>
    </Alert.Root>
  {/if}
</div>

<style>
  .game-info-mini {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .status-row {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .turn-badge {
    display: flex;
    align-items: center;
    background: rgba(0, 0, 0, 0.6);
    border: 1px solid #333;
    border-radius: 2px;
    overflow: hidden;
    height: 24px;
    font-family: var(--font-display);
  }

  .turn-badge.red {
    border-color: #ef4444;
    box-shadow: 0 0 5px rgba(239, 68, 68, 0.3);
  }

  .turn-badge.blue {
    border-color: #3b82f6;
    box-shadow: 0 0 5px rgba(59, 130, 246, 0.3);
  }

  .label {
    background: #222;
    color: #888;
    font-size: 0.7rem;
    font-weight: 700;
    padding: 0 6px;
    height: 100%;
    display: flex;
    align-items: center;
    text-transform: uppercase;
  }

  .value {
    padding: 0 8px;
    font-weight: 700;
    font-size: 0.8rem;
    text-transform: uppercase;
    color: #e5e5e5;
  }

  .turn-badge.red .value {
    color: #ef4444;
  }

  .turn-badge.blue .value {
    color: #3b82f6;
  }

  /* Alert overrides for Modern Warfare theme */
  .check-alert {
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.5);
    animation: pulse-red 1.5s infinite;
  }

  .check-alert :global(.alert-title) {
    color: #ef4444;
    font-family: var(--font-display);
    letter-spacing: 0.05em;
  }

  .game-over-alert {
    background: rgba(16, 185, 129, 0.1);
    border: 1px solid rgba(16, 185, 129, 0.5);
  }

  .game-over-alert :global(.alert-title) {
    color: #10b981;
    font-family: var(--font-display);
    letter-spacing: 0.05em;
  }

  @keyframes pulse-red {
    0%,
    100% {
      box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4);
    }
    50% {
      box-shadow: 0 0 0 8px rgba(239, 68, 68, 0);
    }
  }
</style>
