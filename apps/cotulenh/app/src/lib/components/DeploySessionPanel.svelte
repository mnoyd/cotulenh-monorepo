<script lang="ts">
  import type { CoTuLenh } from '@cotulenh/core';
  import type { UIDeployState } from '$lib/types/game';

  let {
    game,
    deployState,
    onCommit,
    onCancel
  }: {
    game: CoTuLenh | null;
    deployState: UIDeployState | null;
    onCommit: () => void;
    onCancel: () => void;
  } = $props();

  let hasSession = $derived(deployState !== null);
  let canCommit = $derived(deployState && game ? game.canCommitSession() : false);
</script>

<div class="deploy-panel-mini">
  {#if hasSession}
    <div class="actions">
      <button class="action-btn commit" onclick={onCommit} disabled={!canCommit}>
        COMMIT DEPLOY
      </button>
      <button class="action-btn cancel" onclick={onCancel}> ABORT </button>
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
    border-left: 2px solid rgba(0, 255, 255, 0.15);
    min-height: 40px;
    display: flex;
    align-items: center;
    box-shadow: inset 0 0 10px rgba(0, 243, 255, 0.05);
  }

  .hint-text {
    font-size: 0.7rem;
    color: #666;
    font-weight: 600;
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }

  .actions {
    display: flex;
    gap: 8px;
    width: 100%;
  }

  .action-btn {
    flex: 1;
    border: 1px solid;
    font-weight: 700;
    font-size: 0.7rem;
    padding: 10px 8px;
    cursor: pointer;
    border-radius: 2px;
    transition: all 0.2s ease;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    position: relative;
    overflow: hidden;
  }

  .action-btn::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
    transform: translateX(-100%);
    transition: transform 0.5s;
  }

  .action-btn:hover::before {
    transform: translateX(100%);
  }

  .action-btn.commit {
    background: rgba(0, 255, 65, 0.15);
    border-color: #00ff41;
    color: #00ff41;
    box-shadow:
      inset 0 0 10px rgba(0, 255, 65, 0.1),
      0 0 5px rgba(0, 255, 65, 0.2);
  }

  .action-btn.commit:hover:not(:disabled) {
    background: rgba(0, 255, 65, 0.25);
    box-shadow:
      0 0 15px #00ff41,
      inset 0 0 10px rgba(0, 255, 65, 0.2);
    transform: translateY(-1px);
  }

  .action-btn.commit:disabled {
    background: rgba(50, 50, 50, 0.3);
    border-color: #333;
    color: #444;
    cursor: not-allowed;
    box-shadow: none;
  }

  .action-btn.cancel {
    background: rgba(255, 80, 0, 0.15);
    border-color: #ffab00;
    color: #ffab00;
    box-shadow:
      inset 0 0 10px rgba(255, 80, 0, 0.1),
      0 0 5px rgba(255, 171, 0, 0.2);
  }

  .action-btn.cancel:hover:not(:disabled) {
    background: rgba(255, 80, 0, 0.25);
    box-shadow:
      0 0 15px #ffab00,
      inset 0 0 10px rgba(255, 80, 0, 0.2);
    transform: translateY(-1px);
  }

  .action-btn:active:not(:disabled) {
    transform: translateY(0);
  }
</style>
