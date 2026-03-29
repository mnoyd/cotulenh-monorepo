<script lang="ts">
  import { getI18n } from '$lib/i18n/index.svelte';
  import type { TranslationKey } from '$lib/i18n/types';
  import type { FriendSearchResult, FriendListItem, PendingRequestItem } from '$lib/friends/types';
  import { getOnlineUsers } from '$lib/friends/presence.svelte';
  import { sortFriendsByOnline } from '$lib/friends/sort';
  import CommandCenter from '$lib/components/CommandCenter.svelte';
  import FriendChallengeDialog from '$lib/components/FriendChallengeDialog.svelte';
  import { AlertDialog } from 'bits-ui';
  import { toast } from 'svelte-sonner';
  import type { GameConfig } from '$lib/invitations/types';
  import type { PageData } from './$types';

  import '$lib/styles/command-center.css';

  const i18n = getI18n();

  let { data }: { data: PageData } = $props();

  let searchQuery = $state('');
  let searchResults = $state<FriendSearchResult[]>([]);
  let isSearching = $state(false);
  let hasSearched = $state(false);
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  let optimisticPending = $state(new Set<string>());
  let removedIncoming = $state(new Set<string>());
  let removedSent = $state(new Set<string>());
  let removedFriends = $state(new Set<string>());
  let loadingRequests = $state(new Set<string>());
  let optimisticFriends = $state<Array<{ friendshipId: string; userId: string; displayName: string }>>([]);

  let removeDialogOpen = $state(false);
  let friendToRemove = $state<{ friendshipId: string; displayName: string } | null>(null);
  let isRemoving = $state(false);

  // Friend challenge state
  let challengeDialogOpen = $state(false);
  let challengeTarget = $state<{ id: string; displayName: string; rating?: number } | null>(null);
  let challengePending = $state(new Set<string>());

  let visibleIncoming = $derived(
    data.incomingRequests.filter((r: PendingRequestItem) => !removedIncoming.has(r.friendshipId))
  );
  let visibleSent = $derived(
    data.sentRequests.filter((r: PendingRequestItem) => !removedSent.has(r.friendshipId))
  );

  let onlineUsers = $derived(getOnlineUsers());

  let allFriends = $derived.by(() => {
    const merged = [...data.friends, ...optimisticFriends].filter(
      (f) => !removedFriends.has(f.friendshipId)
    );
    return sortFriendsByOnline(merged, onlineUsers);
  });

  let searchSectionEl: HTMLElement | undefined = $state();
  let showDropdown = $state(false);

  function handleClickOutside(event: MouseEvent) {
    if (searchSectionEl && !searchSectionEl.contains(event.target as Node)) {
      showDropdown = false;
    }
  }

  $effect(() => {
    if (typeof document !== 'undefined') {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  });

  function debounceSearch() {
    if (debounceTimer) clearTimeout(debounceTimer);
    if (searchQuery.trim().length < 2) {
      searchResults = []; hasSearched = false; showDropdown = false; return;
    }
    showDropdown = true;
    debounceTimer = setTimeout(async () => {
      isSearching = true;
      try {
        const response = await fetch('?/search', {
          method: 'POST',
          body: new URLSearchParams({ query: searchQuery.trim() }),
          headers: { 'x-sveltekit-action': 'true' }
        });
        const result = await response.json();
        const actionData = result?.data;
        if (actionData && Array.isArray(actionData)) searchResults = actionData;
        else if (Array.isArray(actionData?.results)) searchResults = actionData.results;
        else searchResults = result?.data?.results ?? [];
        hasSearched = true;
      } catch { searchResults = []; hasSearched = true; }
      finally { isSearching = false; }
    }, 300);
  }

  async function postAction(action: string, body: Record<string, string>): Promise<boolean> {
    const response = await fetch(`?/${action}`, {
      method: 'POST', body: new URLSearchParams(body),
      headers: { 'x-sveltekit-action': 'true' }
    });
    return response.ok;
  }

  async function handleSendRequest(toUserId: string) {
    optimisticPending = new Set([...optimisticPending, toUserId]);
    try {
      const ok = await postAction('sendRequest', { toUserId });
      if (!ok) {
        const next = new Set(optimisticPending); next.delete(toUserId); optimisticPending = next;
        toast.error(i18n.t('friends.toast.requestFailed')); return;
      }
      toast.success(i18n.t('friends.toast.requestSent'), { duration: 4000 });
    } catch {
      const next = new Set(optimisticPending); next.delete(toUserId); optimisticPending = next;
      toast.error(i18n.t('friends.toast.requestFailed'));
    }
  }

  async function handleAcceptRequest(friendshipId: string) {
    loadingRequests = new Set([...loadingRequests, friendshipId]);
    const request = data.incomingRequests.find((r: PendingRequestItem) => r.friendshipId === friendshipId);
    try {
      const ok = await postAction('acceptRequest', { friendshipId });
      if (!ok) { toast.error(i18n.t('friends.toast.actionFailed')); return; }
      removedIncoming = new Set([...removedIncoming, friendshipId]);
      if (request) {
        optimisticFriends = [...optimisticFriends, { friendshipId, userId: request.userId, displayName: request.displayName }];
      }
      toast.success(i18n.t('friends.toast.requestAccepted'), { duration: 4000 });
    } catch { toast.error(i18n.t('friends.toast.actionFailed')); }
    finally { const next = new Set(loadingRequests); next.delete(friendshipId); loadingRequests = next; }
  }

  async function handleDeclineRequest(friendshipId: string) {
    loadingRequests = new Set([...loadingRequests, friendshipId]);
    try {
      const ok = await postAction('declineRequest', { friendshipId });
      if (!ok) { toast.error(i18n.t('friends.toast.actionFailed')); return; }
      removedIncoming = new Set([...removedIncoming, friendshipId]);
      toast.success(i18n.t('friends.toast.requestDeclined'), { duration: 4000 });
    } catch { toast.error(i18n.t('friends.toast.actionFailed')); }
    finally { const next = new Set(loadingRequests); next.delete(friendshipId); loadingRequests = next; }
  }

  async function handleCancelRequest(friendshipId: string) {
    loadingRequests = new Set([...loadingRequests, friendshipId]);
    try {
      const ok = await postAction('cancelRequest', { friendshipId });
      if (!ok) { toast.error(i18n.t('friends.toast.actionFailed')); return; }
      removedSent = new Set([...removedSent, friendshipId]);
      toast.success(i18n.t('friends.toast.requestCancelled'), { duration: 4000 });
    } catch { toast.error(i18n.t('friends.toast.actionFailed')); }
    finally { const next = new Set(loadingRequests); next.delete(friendshipId); loadingRequests = next; }
  }

  function openChallengeDialog(friend: FriendListItem) {
    challengeTarget = {
      id: friend.userId,
      displayName: friend.displayName,
      ...(friend.rating != null ? { rating: friend.rating } : {})
    };
    challengeDialogOpen = true;
  }

  async function handleSendChallenge(config: GameConfig & { toUserId: string }) {
    const { toUserId, ...gameConfig } = config;
    challengePending = new Set([...challengePending, toUserId]);
    try {
      const ok = await postAction('sendFriendChallenge', {
        toUserId,
        gameConfig: JSON.stringify(gameConfig)
      });
      if (!ok) {
        const next = new Set(challengePending); next.delete(toUserId); challengePending = next;
        toast.error(i18n.t('invitation.toast.sendFailed')); return;
      }
      toast.success(i18n.t('invitation.toast.sent'), { duration: 4000 });
    } catch {
      const next = new Set(challengePending); next.delete(toUserId); challengePending = next;
      toast.error(i18n.t('invitation.toast.sendFailed'));
    }
  }

  function openRemoveDialog(friend: FriendListItem) {
    friendToRemove = { friendshipId: friend.friendshipId, displayName: friend.displayName };
    removeDialogOpen = true;
  }

  async function handleRemoveFriend() {
    if (!friendToRemove) return;
    isRemoving = true;
    const { friendshipId } = friendToRemove;
    try {
      const ok = await postAction('removeFriend', { friendshipId });
      if (!ok) { toast.error(i18n.t('friends.toast.removeFailed')); return; }
      removedFriends = new Set([...removedFriends, friendshipId]);
      toast.success(i18n.t('friends.toast.friendRemoved'), { duration: 4000 });
    } catch { toast.error(i18n.t('friends.toast.removeFailed')); }
    finally { isRemoving = false; removeDialogOpen = false; friendToRemove = null; }
  }

  function getButtonLabel(result: FriendSearchResult): TranslationKey {
    if (optimisticPending.has(result.id)) return 'friends.action.pending';
    if (result.relationship === 'accepted') return 'friends.action.friends';
    if (result.relationship === 'pending_sent') return 'friends.action.pending';
    if (result.relationship === 'pending_received') return 'friends.action.pending';
    return 'friends.action.sendRequest';
  }

  function isActionDisabled(result: FriendSearchResult): boolean {
    return optimisticPending.has(result.id) ||
      result.relationship === 'accepted' ||
      result.relationship === 'pending_sent' ||
      result.relationship === 'pending_received';
  }
</script>

<svelte:head>
  <title>{i18n.t('friends.title')} | {i18n.t('nav.appName')}</title>
</svelte:head>

<CommandCenter center={centerContent} />

{#if challengeTarget}
  <FriendChallengeDialog
    bind:open={challengeDialogOpen}
    friend={challengeTarget}
    onsubmit={handleSendChallenge}
  />
{/if}

<AlertDialog.Root bind:open={removeDialogOpen}>
  <AlertDialog.Portal>
    <AlertDialog.Overlay class="alert-overlay" />
    <AlertDialog.Content class="alert-content">
      <AlertDialog.Title class="alert-title">{i18n.t('friends.remove.title')}</AlertDialog.Title>
      <AlertDialog.Description class="alert-description">
        {i18n.t('friends.remove.description').replace('{name}', friendToRemove?.displayName ?? '')}
      </AlertDialog.Description>
      <div class="alert-actions">
        <AlertDialog.Cancel class="alert-cancel-btn">{i18n.t('friends.remove.cancel')}</AlertDialog.Cancel>
        <AlertDialog.Action class="alert-action-btn" onclick={handleRemoveFriend} disabled={isRemoving}>
          {i18n.t('friends.remove.confirm')}
        </AlertDialog.Action>
      </div>
    </AlertDialog.Content>
  </AlertDialog.Portal>
</AlertDialog.Root>

{#snippet centerContent()}
  <div class="friends-center">
    <h1 class="section-header">{i18n.t('friends.title')}</h1>

    <!-- Search -->
    <section class="search-section" bind:this={searchSectionEl}>
      <input
        type="text"
        class="search-input"
        placeholder={i18n.t('friends.search.placeholder')}
        bind:value={searchQuery}
        oninput={debounceSearch}
        aria-label={i18n.t('friends.search.placeholder')}
      />

      <div class="sr-only" aria-live="polite" aria-atomic="true">
        {#if hasSearched && !isSearching}
          {#if searchResults.length === 0}
            {i18n.t('friends.search.noResults')}
          {:else}
            {searchResults.length} {i18n.t('friends.search.resultsFound')}
          {/if}
        {/if}
      </div>

      {#if showDropdown && searchQuery.trim().length >= 2}
        <div class="search-results" role="listbox">
          {#if isSearching}
            <span class="text-secondary">{i18n.t('common.loading')}</span>
          {:else if hasSearched && searchResults.length === 0}
            <span class="text-secondary">{i18n.t('friends.search.noResults')}</span>
          {:else}
            {#each searchResults as result (result.id)}
              <div class="flat-list-item" role="option" aria-selected="false">
                <span>{result.displayName}</span>
                <button
                  class="text-link"
                  disabled={isActionDisabled(result)}
                  onclick={() => handleSendRequest(result.id)}
                >
                  {i18n.t(getButtonLabel(result))}
                </button>
              </div>
            {/each}
          {/if}
        </div>
      {/if}
    </section>

    <hr class="divider" />

    <!-- Incoming requests -->
    <span class="section-header">{i18n.t('friends.requests.incoming')} ({visibleIncoming.length})</span>
    {#if visibleIncoming.length > 0}
      <div class="flat-list">
        {#each visibleIncoming as request (request.friendshipId)}
          <div class="flat-list-item">
            <span>{request.displayName}</span>
            <div class="actions">
              <button class="text-link" disabled={loadingRequests.has(request.friendshipId)} onclick={() => handleAcceptRequest(request.friendshipId)}>accept</button>
              <button class="text-link" disabled={loadingRequests.has(request.friendshipId)} onclick={() => handleDeclineRequest(request.friendshipId)}>decline</button>
            </div>
          </div>
        {/each}
      </div>
    {:else}
      <span class="text-secondary">{i18n.t('friends.requests.emptyIncoming')}</span>
    {/if}

    <!-- Sent requests -->
    {#if visibleSent.length > 0}
      <hr class="divider" />
      <span class="section-header">{i18n.t('friends.requests.sent')} ({visibleSent.length})</span>
      <div class="flat-list">
        {#each visibleSent as request (request.friendshipId)}
          <div class="flat-list-item">
            <span>{request.displayName}</span>
            <button class="text-link" disabled={loadingRequests.has(request.friendshipId)} onclick={() => handleCancelRequest(request.friendshipId)}>cancel</button>
          </div>
        {/each}
      </div>
    {/if}

    <hr class="divider" />

    <!-- Friends list -->
    <span class="section-header">{i18n.t('friends.list.title')} ({allFriends.length})</span>
    {#if allFriends.length === 0}
      <span class="text-secondary">{i18n.t('friends.empty.title')}</span>
    {:else}
      <div class="flat-list">
        {#each allFriends as friend (friend.friendshipId)}
          <div class="flat-list-item">
            <span class="status-dot" class:online={onlineUsers.has(friend.userId)}></span>
            <span class="friend-name">{friend.displayName}</span>
            <div class="actions">
              {#if challengePending.has(friend.userId)}
                <span class="text-secondary">{i18n.t('invitation.action.invited')}</span>
              {:else}
                <button
                  class="text-link"
                  disabled={!onlineUsers.has(friend.userId)}
                  onclick={() => openChallengeDialog(friend)}
                >
                  {i18n.t('friend.challenge.action.challenge')}
                </button>
              {/if}
              <button class="text-link danger" onclick={() => openRemoveDialog(friend)}>
                {i18n.t('friends.remove.button')}
              </button>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
{/snippet}

<style>
  .friends-center {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding-top: 1rem;
  }

  .text-secondary {
    color: var(--theme-text-secondary, #aaa);
    font-size: 0.8125rem;
  }

  .search-section {
    position: relative;
  }

  .search-input {
    width: 100%;
    padding: 0.375rem 0.5rem;
    background: var(--theme-bg-dark, #111);
    border: 1px solid var(--theme-border, #333);
    color: var(--theme-text-primary, #eee);
    font-size: 0.875rem;
  }

  .search-input:focus {
    outline: none;
    border-color: var(--theme-primary, #06b6d4);
  }

  .search-results {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    right: 0;
    background: var(--theme-bg-panel, #1a1a1a);
    border: 1px solid var(--theme-border, #333);
    max-height: 300px;
    overflow-y: auto;
    z-index: 50;
    padding: 0.5rem;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .actions {
    display: flex;
    gap: 0.5rem;
  }

  .friend-name {
    flex: 1;
    font-size: 0.875rem;
    color: var(--theme-text-primary, #eee);
  }

  .online {
    background: #22c55e !important;
  }

  .danger {
    color: #ef4444;
  }

  .sr-only {
    position: absolute;
    width: 1px; height: 1px;
    padding: 0; margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border-width: 0;
  }

  :global(.alert-overlay) {
    position: fixed; inset: 0; z-index: 50;
    background: rgba(0, 0, 0, 0.5);
  }

  :global(.alert-content) {
    position: fixed; top: 50%; left: 50%;
    transform: translate(-50%, -50%);
    z-index: 50;
    width: calc(100% - 2rem); max-width: 28rem;
    background: var(--theme-bg-panel, #1a1a1a);
    border: 1px solid var(--theme-border, #333);
    padding: 1rem;
    display: flex; flex-direction: column; gap: 0.75rem;
  }

  :global(.alert-title) {
    font-size: 1rem; font-weight: 600;
    color: var(--theme-text-primary, #eee); margin: 0;
  }

  :global(.alert-description) {
    font-size: 0.8125rem;
    color: var(--theme-text-secondary, #aaa); margin: 0;
  }

  .alert-actions {
    display: flex; justify-content: flex-end; gap: 0.75rem;
  }

  :global(.alert-cancel-btn) {
    padding: 0.375rem 0.75rem;
    border: 1px solid var(--theme-border, #333);
    background: transparent;
    color: var(--theme-text-primary, #eee);
    font-size: 0.8125rem; cursor: pointer;
  }

  :global(.alert-action-btn) {
    padding: 0.375rem 0.75rem;
    border: 1px solid #ef4444;
    background: #ef4444; color: white;
    font-size: 0.8125rem; cursor: pointer;
  }

  :global(.alert-action-btn:disabled) {
    opacity: 0.6; cursor: not-allowed;
  }
</style>
