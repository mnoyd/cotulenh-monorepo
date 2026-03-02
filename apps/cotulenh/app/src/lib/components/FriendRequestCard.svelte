<script lang="ts">
  import { getI18n } from '$lib/i18n/index.svelte';
  import { Loader2 } from 'lucide-svelte';
  import Button from '$lib/components/ui/button/button.svelte';

  interface Props {
    displayName: string;
    friendshipId: string;
    direction: 'incoming' | 'sent';
    loading?: boolean;
    onaccept?: (friendshipId: string) => void;
    ondecline?: (friendshipId: string) => void;
    oncancel?: (friendshipId: string) => void;
  }

  let {
    displayName,
    friendshipId,
    direction,
    loading = false,
    onaccept,
    ondecline,
    oncancel
  }: Props = $props();

  const i18n = getI18n();

  let initial = $derived(displayName ? displayName.charAt(0).toUpperCase() : '?');
</script>

<div class="request-card">
  <span class="request-avatar" aria-hidden="true">{initial}</span>
  <span class="request-name">{displayName}</span>
  <div class="request-actions">
    {#if loading}
      <Loader2 size={18} class="animate-spin request-spinner" />
    {:else if direction === 'incoming'}
      <Button
        size="sm"
        class="request-btn"
        onclick={() => onaccept?.(friendshipId)}
        aria-label="{i18n.t('friends.action.accept')} {displayName}"
      >
        {i18n.t('friends.action.accept')}
      </Button>
      <Button
        size="sm"
        variant="outline"
        class="request-btn"
        onclick={() => ondecline?.(friendshipId)}
        aria-label="{i18n.t('friends.action.decline')} {displayName}"
      >
        {i18n.t('friends.action.decline')}
      </Button>
    {:else}
      <Button
        size="sm"
        variant="outline"
        class="request-btn"
        onclick={() => oncancel?.(friendshipId)}
        aria-label="{i18n.t('friends.action.cancel')} {displayName}"
      >
        {i18n.t('friends.action.cancel')}
      </Button>
    {/if}
  </div>
</div>

<style>
  .request-card {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem;
    border-radius: 8px;
    background: var(--theme-bg-panel, #222);
    border: 1px solid var(--theme-border, #444);
    min-height: 44px;
  }

  .request-avatar {
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

  .request-name {
    flex: 1;
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--theme-text-primary, #eee);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .request-actions {
    display: flex;
    gap: 0.5rem;
    flex-shrink: 0;
    align-items: center;
  }

  :global(.request-spinner) {
    color: var(--theme-primary, #06b6d4);
  }

  :global(.request-btn) {
    min-height: 44px;
    min-width: 44px;
  }
</style>
