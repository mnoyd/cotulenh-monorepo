<script lang="ts">
  import type { CoTuLenh } from '@repo/cotulenh-core';
  import { gameStore } from '$lib/stores/game';

  export let game: CoTuLenh | null;
  export let onCommit: () => void;
  export let onCancel: () => void;

  $: deployState = $gameStore.deployState;
  $: hasSession = deployState !== null;

  // derived from game.canCommitSession() which returns boolean
  $: canCommit = deployState && game ? game.canCommitSession() : false;
</script>

<div class="deploy-panel" class:active={hasSession}>
  {#if hasSession}
    <div class="active-interface">
      <div class="deploy-status">
        <span class="status-indicator"></span>
        <span class="status-text">UPLINK ACTIVE</span>
      </div>

      <div class="action-grid">
        <button
          class="btn-commit"
          on:click={onCommit}
          disabled={!canCommit}
          title={canCommit ? 'Confirm Deployment' : 'Deployment Incomplete'}
        >
          <span class="btn-label">COMMIT</span>
          <span class="btn-sub">{canCommit ? 'READY' : 'PENDING'}</span>
        </button>

        <button class="btn-cancel" on:click={onCancel} title="Abort Deployment">
          <span class="btn-label">ABORT</span>
          <span class="btn-sub">CANCEL</span>
        </button>
      </div>
    </div>
  {:else}
    <div class="inactive-interface">
      <div class="hint-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path
            d="M12 6V12L16 14M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12Z"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </div>
      <div class="hint-text">
        <span class="hint-title">AWAITING INPUT</span>
        <span class="hint-desc">Right-click or Double-tap stack to deploy</span>
      </div>
    </div>
  {/if}
</div>

<style>
  .deploy-panel {
    padding: var(--spacing-sm);
    background: transparent;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  }

  /* Active State */
  .active-interface {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
    animation: fadeIn 0.3s ease-out;
  }

  .deploy-status {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 4px;
    background: rgba(37, 99, 235, 0.1);
    padding: 2px 8px;
    border-radius: 2px;
    align-self: flex-start;
  }

  .status-indicator {
    width: 6px;
    height: 6px;
    background-color: var(--color-success, #10b981);
    border-radius: 50%;
    box-shadow: 0 0 8px var(--color-success, #10b981);
    animation: blink 2s infinite;
  }

  .status-text {
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    color: var(--mw-primary);
  }

  .action-grid {
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: var(--spacing-sm);
  }

  button {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--spacing-sm);
    border: none;
    border-radius: 2px;
    cursor: pointer;
    transition: all 0.2s;
    position: relative;
    overflow: hidden;
    height: 50px;
  }

  .btn-label {
    font-weight: 800;
    font-size: 0.9rem;
    letter-spacing: 0.05em;
  }

  .btn-sub {
    font-size: 0.65rem;
    opacity: 0.7;
    margin-top: 2px;
  }

  .btn-commit {
    background: rgba(16, 185, 129, 0.2);
    border: 1px solid rgba(16, 185, 129, 0.5);
    color: #10b981;
  }

  .btn-commit:hover:not(:disabled) {
    background: rgba(16, 185, 129, 0.4);
    box-shadow: 0 0 15px rgba(16, 185, 129, 0.2);
  }

  .btn-commit:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    background: rgba(100, 100, 100, 0.1);
    border-color: rgba(100, 100, 100, 0.3);
    color: #888;
  }

  .btn-cancel {
    background: rgba(239, 68, 68, 0.2);
    border: 1px solid rgba(239, 68, 68, 0.5);
    color: #ef4444;
  }

  .btn-cancel:hover {
    background: rgba(239, 68, 68, 0.4);
    box-shadow: 0 0 15px rgba(239, 68, 68, 0.2);
  }

  /* Inactive State */
  .inactive-interface {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
    opacity: 0.6;
    padding: var(--spacing-sm);
  }

  .hint-icon svg {
    width: 24px;
    height: 24px;
    color: var(--mw-text-muted);
  }

  .hint-text {
    display: flex;
    flex-direction: column;
  }

  .hint-title {
    font-size: 0.75rem;
    font-weight: 700;
    color: var(--mw-text-muted);
    letter-spacing: 0.1em;
  }

  .hint-desc {
    font-size: 0.75rem;
    color: var(--mw-text-dim);
  }

  @keyframes blink {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.3;
    }
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(5px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
</style>
