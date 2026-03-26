<script lang="ts">
  import { getI18n } from '$lib/i18n/index.svelte';
  import type { InvitationItem } from '$lib/invitations/types';

  const i18n = getI18n();

  let {
    challenge,
    currentUserId,
    loadingAccept = false,
    loadingCancel = false,
    onaccept,
    oncancel
  }: {
    challenge: InvitationItem;
    currentUserId: string;
    loadingAccept?: boolean;
    loadingCancel?: boolean;
    onaccept: (id: string) => void;
    oncancel: (id: string) => void;
  } = $props();

  let isOwn = $derived(challenge.fromUser.id === currentUserId);
  let timeLabel = $derived(
    `${challenge.gameConfig.timeMinutes}+${challenge.gameConfig.incrementSeconds}`
  );
  let matchTypeLabel = $derived(
    challenge.gameConfig.isRated ? i18n.t('lobby.rated') : i18n.t('lobby.casual')
  );
</script>

<div class="flat-list-item">
  <span class="challenger-name">
    {isOwn ? i18n.t('lobby.yourChallenge') : (challenge.fromUser.displayName || '...')}
  </span>
  <span class="text-dim">{timeLabel}</span>
  <span class="match-type">{matchTypeLabel}</span>
  {#if isOwn}
    <button
      class="text-link"
      disabled={loadingCancel}
      onclick={() => oncancel(challenge.id)}
    >
      {loadingCancel ? '...' : i18n.t('lobby.cancel')}
    </button>
  {:else}
    <button
      class="text-link"
      disabled={loadingAccept}
      onclick={() => onaccept(challenge.id)}
    >
      {loadingAccept ? '...' : i18n.t('lobby.accept')}
    </button>
  {/if}
</div>

<style>
  .challenger-name {
    flex: 1;
    font-size: 0.8125rem;
    color: var(--theme-text-primary, #eee);
  }

  .text-dim {
    color: var(--theme-text-secondary, #666);
    font-size: 0.8125rem;
  }

  .match-type {
    border: 1px solid var(--theme-border, #333);
    border-radius: 999px;
    color: var(--theme-text-secondary, #aaa);
    font-size: 0.6875rem;
    letter-spacing: 0.04em;
    padding: 0.125rem 0.5rem;
    text-transform: uppercase;
  }
</style>
