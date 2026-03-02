<script lang="ts">
  import { getI18n } from '$lib/i18n/index.svelte';
  import { Loader2 } from 'lucide-svelte';
  import Button from '$lib/components/ui/button/button.svelte';
  import type { InvitationItem } from '$lib/invitations/types';

  interface Props {
    invitation: InvitationItem;
    loadingAccept?: boolean;
    loadingDecline?: boolean;
    onaccept?: (invitationId: string) => void;
    ondecline?: (invitationId: string) => void;
  }

  let {
    invitation,
    loadingAccept = false,
    loadingDecline = false,
    onaccept,
    ondecline
  }: Props = $props();

  const i18n = getI18n();

  let displayName = $derived(invitation.fromUser.displayName || '?');
  let initial = $derived(displayName.charAt(0).toUpperCase() || '?');
  let timeLabel = $derived(
    `${invitation.gameConfig.timeMinutes}+${invitation.gameConfig.incrementSeconds}`
  );
  let isLoading = $derived(loadingAccept || loadingDecline);
</script>

<div class="invitation-card received">
  <span class="invitation-avatar" aria-hidden="true">{initial}</span>
  <div class="invitation-info">
    <span class="invitation-name">{displayName}</span>
    <span class="invitation-time">{timeLabel}</span>
  </div>
  <div class="invitation-actions">
    <Button
      size="sm"
      class="accept-btn"
      disabled={isLoading}
      onclick={() => onaccept?.(invitation.id)}
      aria-label="{i18n.t('invitation.action.accept')} {displayName}"
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
      disabled={isLoading}
      onclick={() => ondecline?.(invitation.id)}
      aria-label="{i18n.t('invitation.action.decline')} {displayName}"
    >
      {#if loadingDecline}
        <Loader2 size={14} class="animate-spin" />
      {/if}
      {i18n.t('invitation.action.decline')}
    </Button>
  </div>
</div>

<style>
  .invitation-card {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem;
    border-radius: 8px;
    background: var(--theme-bg-panel, #222);
    border: 1px solid var(--theme-border, #444);
    min-height: 44px;
  }

  .invitation-card.received {
    border-color: var(--theme-primary, #06b6d4);
    border-width: 1px;
  }

  .invitation-avatar {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: var(--theme-primary, #06b6d4);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.875rem;
    font-weight: 700;
    font-family: var(--font-mono);
    flex-shrink: 0;
  }

  .invitation-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
    overflow: hidden;
  }

  .invitation-name {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--theme-text-primary, #eee);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .invitation-time {
    font-size: 0.75rem;
    color: var(--theme-text-secondary, #aaa);
  }

  .invitation-actions {
    display: flex;
    gap: 0.5rem;
    flex-shrink: 0;
    align-items: center;
  }

  :global(.accept-btn) {
    min-height: 44px;
    min-width: 44px;
  }

  :global(.decline-btn) {
    min-height: 44px;
    min-width: 44px;
  }

  :global(.animate-spin) {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
</style>
