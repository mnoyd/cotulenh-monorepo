<script lang="ts">
  import { getI18n } from '$lib/i18n/index.svelte';
  import { Loader2, Swords } from 'lucide-svelte';
  import Button from '$lib/components/ui/button/button.svelte';

  interface Props {
    invitationId: string;
    fromDisplayName: string;
    gameConfig: { timeMinutes: number; incrementSeconds: number };
    onaccept: (invitationId: string) => Promise<void>;
    ondecline: (invitationId: string) => Promise<void>;
    ondismiss: () => void;
  }

  let {
    invitationId,
    fromDisplayName,
    gameConfig,
    onaccept,
    ondecline,
    ondismiss
  }: Props = $props();

  const i18n = getI18n();

  let loadingAccept = $state(false);
  let loadingDecline = $state(false);

  let timeLabel = $derived(
    gameConfig.incrementSeconds > 0
      ? `${gameConfig.timeMinutes}+${gameConfig.incrementSeconds}`
      : `${gameConfig.timeMinutes}+0`
  );

  async function handleAccept() {
    loadingAccept = true;
    try {
      await onaccept(invitationId);
    } finally {
      loadingAccept = false;
    }
  }

  async function handleDecline() {
    loadingDecline = true;
    try {
      await ondecline(invitationId);
    } finally {
      loadingDecline = false;
    }
  }
</script>

<div
  class="toast-overlay"
  role="alertdialog"
  aria-label={i18n.t('invitation.notification.title')}
  aria-describedby="invitation-toast-desc"
>
  <div class="toast-card">
    <div class="toast-header">
      <Swords size={20} class="toast-icon" />
      <span class="toast-title">{i18n.t('invitation.notification.title')}</span>
      <button
        class="toast-close"
        onclick={ondismiss}
        aria-label={i18n.t('common.close')}
      >
        &times;
      </button>
    </div>

    <p id="invitation-toast-desc" class="toast-body">
      <strong>{fromDisplayName}</strong>
      {i18n.t('invitation.notification.challengeMessage')}
      <span class="time-badge">{timeLabel}</span>
    </p>

    <div class="toast-actions">
      <Button
        size="sm"
        class="accept-btn"
        disabled={loadingAccept || loadingDecline}
        onclick={handleAccept}
        aria-label={i18n.t('invitation.action.accept')}
      >
        {#if loadingAccept}
          <Loader2 size={14} class="animate-spin" />
        {/if}
        {i18n.t('invitation.action.accept')}
      </Button>
      <Button
        size="sm"
        variant="outline"
        class="decline-btn"
        disabled={loadingAccept || loadingDecline}
        onclick={handleDecline}
        aria-label={i18n.t('invitation.action.decline')}
      >
        {#if loadingDecline}
          <Loader2 size={14} class="animate-spin" />
        {/if}
        {i18n.t('invitation.action.decline')}
      </Button>
    </div>
  </div>
</div>

<style>
  .toast-overlay {
    position: fixed;
    bottom: 1.5rem;
    right: 1.5rem;
    z-index: 200;
    max-width: 380px;
    width: calc(100vw - 2rem);
  }

  .toast-card {
    background: var(--theme-bg-panel, #222);
    border: 1px solid var(--theme-primary, #06b6d4);
    border-radius: 12px;
    padding: 1rem;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .toast-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  :global(.toast-icon) {
    color: var(--theme-primary, #06b6d4);
    flex-shrink: 0;
  }

  .toast-title {
    font-size: 0.875rem;
    font-weight: 700;
    color: var(--theme-text-primary, #eee);
    flex: 1;
  }

  .toast-close {
    background: none;
    border: none;
    color: var(--theme-text-secondary, #aaa);
    font-size: 1.25rem;
    cursor: pointer;
    padding: 0;
    line-height: 1;
    min-width: 44px;
    min-height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .toast-close:hover {
    color: var(--theme-text-primary, #eee);
  }

  .toast-body {
    font-size: 0.875rem;
    color: var(--theme-text-secondary, #ccc);
    margin: 0;
    line-height: 1.4;
  }

  .toast-body strong {
    color: var(--theme-text-primary, #eee);
  }

  .time-badge {
    display: inline-block;
    background: var(--theme-bg-elevated, #333);
    color: var(--theme-primary, #06b6d4);
    font-family: var(--font-mono);
    font-size: 0.75rem;
    font-weight: 600;
    padding: 0.125rem 0.5rem;
    border-radius: 4px;
    margin-left: 0.25rem;
  }

  .toast-actions {
    display: flex;
    gap: 0.5rem;
  }

  :global(.accept-btn) {
    min-height: 44px;
    min-width: 44px;
    flex: 1;
  }

  :global(.decline-btn) {
    min-height: 44px;
    min-width: 44px;
    flex: 1;
  }

  :global(.animate-spin) {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  @media (max-width: 767px) {
    .toast-overlay {
      bottom: 1rem;
      right: 0.5rem;
      left: 0.5rem;
      max-width: none;
      width: auto;
    }
  }
</style>
