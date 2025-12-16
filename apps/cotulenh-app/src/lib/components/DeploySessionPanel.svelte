<script lang="ts">
  import type { CoTuLenh } from '@repo/cotulenh-core';
  import { gameStore } from '$lib/stores/game';

  export let game: CoTuLenh | null;
  export let onCommit: () => void;
  export let onCancel: () => void;

  $: deployState = $gameStore.deployState;
  $: hasSession = deployState !== null;
  $: canCommit = deployState && game ? game.canCommitSession() : false;
</script>

<div class="deploy-panel-mini">
  {#if hasSession}
    <div class="actions">
      <button class="action-btn commit" on:click={onCommit} disabled={!canCommit}>
        COMMIT DEPLOY
      </button>
      <button class="action-btn cancel" on:click={onCancel}> ABORT </button>
    </div>
  {:else}
    <div class="hint-text">RIGHT CLICK ON PIECE TO OPEN DEPLOY</div>
  {/if}
</div>

<style>
  .deploy-panel-mini {
    margin-top: 8px;
    padding: 8px;
    background: rgba(0, 0, 0, 0.4);
    border-left: 2px solid #555;
    min-height: 40px;
    display: flex;
    align-items: center;
  }

  .hint-text {
    font-size: 0.7rem;
    color: #666;
    font-weight: 600;
  }

  .actions {
    display: flex;
    gap: 8px;
    width: 100%;
  }

  .action-btn {
    flex: 1;
    border: none;
    font-weight: 700;
    font-size: 0.75rem;
    padding: 8px;
    cursor: pointer;
    border-radius: 2px;
    transition: all 0.2s;
  }

  .action-btn.commit {
    background: #059669;
    color: #fff;
  }
  .action-btn.commit:disabled {
    background: #333;
    color: #555;
    cursor: not-allowed;
  }

  .action-btn.cancel {
    background: #dc2626;
    color: #fff;
  }

  .action-btn:hover:not(:disabled) {
    filter: brightness(1.2);
  }
</style>
