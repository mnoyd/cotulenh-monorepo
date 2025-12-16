<script lang="ts">
  import { getTurnColorName } from '$lib/utils';
  import { gameStore } from '$lib/stores/game';
</script>

<div class="game-info-mini">
  <div class="status-row">
    <div
      class="turn-badge"
      class:red={$gameStore.turn === 'r'}
      class:blue={$gameStore.turn === 'b'}
    >
      <span class="label">TURN</span>
      <span class="value">{$gameStore.turn ? getTurnColorName($gameStore.turn) : '...'}</span>
    </div>

    {#if $gameStore.check}
      <div class="status-badge check">CHECK</div>
    {/if}

    {#if $gameStore.status !== 'playing'}
      <div class="status-badge game-over">
        {$gameStore.status === 'checkmate' ? 'MATE' : $gameStore.status.toUpperCase()}
      </div>
    {/if}
  </div>
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
  }

  .turn-badge.red { border-color: #ef4444; }
  .turn-badge.blue { border-color: #3b82f6; }

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

  .turn-badge.red .value { color: #ef4444; }
  .turn-badge.blue .value { color: #3b82f6; }

  .status-badge {
    height: 24px;
    padding: 0 8px;
    display: flex;
    align-items: center;
    font-size: 0.75rem;
    font-weight: 800;
    text-transform: uppercase;
    border-radius: 2px;
  }

  .status-badge.check {
    background: rgba(239, 68, 68, 0.2);
    border: 1px solid #ef4444;
    color: #ef4444;
    animation: flash 2s infinite;
  }

  .status-badge.game-over {
    background: #10b981;
    color: #000;
  }

  @keyframes flash {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
</style>
