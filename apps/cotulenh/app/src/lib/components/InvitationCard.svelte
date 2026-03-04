<script lang="ts">
  import { getI18n } from '$lib/i18n/index.svelte';
  import { Loader2, Copy, Check } from 'lucide-svelte';
  import Button from '$lib/components/ui/button/button.svelte';
  import type { InvitationItem } from '$lib/invitations/types';

  interface Props {
    invitation: InvitationItem;
    loading?: boolean;
    oncancel?: (invitationId: string) => void;
    oncopy?: (inviteCode: string) => Promise<boolean> | boolean;
  }

  let { invitation, loading = false, oncancel, oncopy }: Props = $props();

  const i18n = getI18n();

  let isLinkInvitation = $derived(invitation.toUser === null);
  let displayName = $derived(
    isLinkInvitation ? i18n.t('inviteLink.label') : (invitation.toUser?.displayName ?? '?')
  );
  let initial = $derived(isLinkInvitation ? '🔗' : (displayName.charAt(0).toUpperCase() || '?'));
  let timeLabel = $derived(
    `${invitation.gameConfig.timeMinutes}+${invitation.gameConfig.incrementSeconds}`
  );
  let copied = $state(false);

  async function handleCopy() {
    try {
      const copyOk = await oncopy?.(invitation.inviteCode);
      if (copyOk === false) {
        return;
      }
      copied = true;
      setTimeout(() => (copied = false), 2000);
    } catch {
      // Clipboard write failed — don't show copied feedback
    }
  }
</script>

<div class="invitation-card">
  <span class="invitation-avatar" class:link-avatar={isLinkInvitation} aria-hidden="true">{initial}</span>
  <div class="invitation-info">
    <div class="invitation-name-row">
      <span class="invitation-name">{displayName}</span>
      {#if isLinkInvitation}
        <span class="link-badge">{i18n.t('inviteLink.badge')}</span>
      {/if}
    </div>
    <span class="invitation-time">{timeLabel}</span>
  </div>
  <div class="invitation-actions">
    {#if loading}
      <Loader2 size={18} class="animate-spin invitation-spinner" />
    {:else}
      {#if isLinkInvitation && oncopy}
        <Button
          size="sm"
          variant="outline"
          class="copy-invite-btn"
          onclick={handleCopy}
          aria-label={copied ? i18n.t('common.copied') : i18n.t('inviteLink.copyLink')}
        >
          {#if copied}
            <Check size={14} />
          {:else}
            <Copy size={14} />
          {/if}
        </Button>
      {/if}
      <Button
        size="sm"
        variant="outline"
        class="cancel-btn"
        onclick={() => oncancel?.(invitation.id)}
        aria-label="{i18n.t('invitation.action.cancel')} {displayName}"
      >
        {i18n.t('invitation.action.cancel')}
      </Button>
    {/if}
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

  .invitation-name-row {
    display: flex;
    align-items: center;
    gap: 0.375rem;
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

  .link-badge {
    font-size: 0.625rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding: 0.125rem 0.375rem;
    background: rgba(6, 182, 212, 0.15);
    color: var(--theme-primary, #06b6d4);
    border-radius: 4px;
    flex-shrink: 0;
  }

  .link-avatar {
    font-size: 1rem;
    background: rgba(6, 182, 212, 0.2);
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

  :global(.invitation-spinner) {
    color: var(--theme-primary, #06b6d4);
  }

  :global(.cancel-btn) {
    min-height: 44px;
    min-width: 44px;
  }

  :global(.copy-invite-btn) {
    min-height: 44px;
    min-width: 44px;
  }
</style>
