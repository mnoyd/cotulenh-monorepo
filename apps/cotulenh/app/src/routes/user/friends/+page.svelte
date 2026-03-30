<script lang="ts">
  import { onMount } from 'svelte';
  import { getI18n } from '$lib/i18n/index.svelte';
  import type { TranslationKey } from '$lib/i18n/types';
  import type { FriendSearchResult, FriendListItem, PendingRequestItem } from '$lib/friends/types';
  import {
    getFriendsList,
    getPendingIncomingRequests,
    getPendingSentRequests,
    searchUsers,
  } from '$lib/friends/queries';
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
  let friends = $state<FriendListItem[]>([]);
  let incomingRequests = $state<PendingRequestItem[]>([]);
  let sentRequests = $state<PendingRequestItem[]>([]);
  let hydratedUserId = $state<string | null>(null);

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
  let optimisticFriends = $state<FriendListItem[]>([]);

  let removeDialogOpen = $state(false);
  let friendToRemove = $state<{ friendshipId: string; displayName: string } | null>(null);
  let isRemoving = $state(false);

  // Friend challenge state
  let challengeDialogOpen = $state(false);
  let challengeTarget = $state<
    { id: string; displayName: string; rating?: number; ratingGamesPlayed?: number } | null
  >(null);
  let challengePending = $state(new Set<string>());
  let incomingOpen = $state(true);
  let sentOpen = $state(true);
  let onlineOpen = $state(true);
  let offlineOpen = $state(true);

  let visibleIncoming = $derived(
    incomingRequests.filter((r: PendingRequestItem) => !removedIncoming.has(r.friendshipId))
  );
  let visibleSent = $derived(
    sentRequests.filter((r: PendingRequestItem) => !removedSent.has(r.friendshipId))
  );

  let onlineUsers = $derived(getOnlineUsers());

  let allFriends = $derived.by(() => {
    const merged = [...friends, ...optimisticFriends].filter((f) => !removedFriends.has(f.friendshipId));
    return sortFriendsByOnline(merged, onlineUsers);
  });

  let onlineFriends = $derived(allFriends.filter((f) => onlineUsers.has(f.userId)));
  let offlineFriends = $derived(allFriends.filter((f) => !onlineUsers.has(f.userId)));

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

  $effect(() => {
    friends = data.friends;
    incomingRequests = data.incomingRequests;
    sentRequests = data.sentRequests;
    hydratedUserId = null;
  });

  async function refreshFriendsData(): Promise<void> {
    const supabase = data.supabase;
    const userId = data.user?.id;
    if (!supabase || !userId) return;

    const [nextFriends, nextIncoming, nextSent] = await Promise.all([
      getFriendsList(supabase, userId),
      getPendingIncomingRequests(supabase, userId),
      getPendingSentRequests(supabase, userId)
    ]);

    friends = nextFriends;
    incomingRequests = nextIncoming;
    sentRequests = nextSent;
  }

  $effect(() => {
    const userId = data.user?.id ?? null;
    if (!data.supabase || !userId || hydratedUserId === userId) return;
    hydratedUserId = userId;
    void refreshFriendsData();
  });

  onMount(() => {
    const supabase = data.supabase;
    const userId = data.user?.id;
    if (!supabase || !userId) return;

    let active = true;
    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (!active || session?.user.id !== userId) return;
      return refreshFriendsData();
    });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user.id !== userId) return;
      void refreshFriendsData();
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
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
        if (data.supabase && data.user?.id) {
          searchResults = await searchUsers(data.supabase, searchQuery.trim(), data.user.id);
        } else {
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
        }
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
      await refreshFriendsData();
      toast.success(i18n.t('friends.toast.requestSent'), { duration: 4000 });
    } catch {
      const next = new Set(optimisticPending); next.delete(toUserId); optimisticPending = next;
      toast.error(i18n.t('friends.toast.requestFailed'));
    }
  }

  async function handleAcceptRequest(friendshipId: string) {
    loadingRequests = new Set([...loadingRequests, friendshipId]);
    const request = incomingRequests.find((r: PendingRequestItem) => r.friendshipId === friendshipId);
    try {
      const ok = await postAction('acceptRequest', { friendshipId });
      if (!ok) { toast.error(i18n.t('friends.toast.actionFailed')); return; }
      removedIncoming = new Set([...removedIncoming, friendshipId]);
      if (request) {
        optimisticFriends = [
          ...optimisticFriends,
          {
            friendshipId,
            userId: request.userId,
            displayName: request.displayName,
            ...(request.rating != null
              ? { rating: request.rating, ratingGamesPlayed: request.ratingGamesPlayed ?? 0 }
              : {})
          }
        ];
      }
      await refreshFriendsData();
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
      await refreshFriendsData();
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
      await refreshFriendsData();
      toast.success(i18n.t('friends.toast.requestCancelled'), { duration: 4000 });
    } catch { toast.error(i18n.t('friends.toast.actionFailed')); }
    finally { const next = new Set(loadingRequests); next.delete(friendshipId); loadingRequests = next; }
  }

  function openChallengeDialog(friend: FriendListItem) {
    challengeTarget = {
      id: friend.userId,
      displayName: friend.displayName,
      ...(friend.rating != null
        ? { rating: friend.rating, ratingGamesPlayed: friend.ratingGamesPlayed ?? 0 }
        : {})
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
      await refreshFriendsData();
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

  function toggleSection(section: 'incoming' | 'sent' | 'online' | 'offline') {
    if (section === 'incoming') incomingOpen = !incomingOpen;
    if (section === 'sent') sentOpen = !sentOpen;
    if (section === 'online') onlineOpen = !onlineOpen;
    if (section === 'offline') offlineOpen = !offlineOpen;
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
        <button
          type="button"
          class="alert-cancel-btn"
          onclick={() => {
            removeDialogOpen = false;
            friendToRemove = null;
          }}
        >
          {i18n.t('friends.remove.cancel')}
        </button>
        <button
          type="button"
          class="alert-action-btn"
          onclick={handleRemoveFriend}
          disabled={isRemoving}
        >
          {i18n.t('friends.remove.confirm')}
        </button>
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
    <section class="friends-section" data-section="incoming-requests">
      <button
        type="button"
        class="section-toggle section-header"
        aria-expanded={incomingOpen}
        onclick={() => toggleSection('incoming')}
      >
        <span>{i18n.t('friends.requests.incoming')} ({visibleIncoming.length})</span>
        <span class="section-chevron" aria-hidden="true">{incomingOpen ? '▾' : '▸'}</span>
      </button>
      {#if incomingOpen}
        {#if visibleIncoming.length > 0}
          <div class="flat-list section-body">
            {#each visibleIncoming as request (request.friendshipId)}
              <div class="flat-list-item">
                <span>{request.displayName}</span>
                <div class="actions">
                  <button class="text-link" disabled={loadingRequests.has(request.friendshipId)} onclick={() => handleAcceptRequest(request.friendshipId)}>{i18n.t('friends.action.accept')}</button>
                  <button class="text-link" disabled={loadingRequests.has(request.friendshipId)} onclick={() => handleDeclineRequest(request.friendshipId)}>{i18n.t('friends.action.decline')}</button>
                </div>
              </div>
            {/each}
          </div>
        {:else}
          <span class="text-secondary section-body">{i18n.t('friends.requests.emptyIncoming')}</span>
        {/if}
      {/if}
    </section>

    <!-- Sent requests -->
    {#if visibleSent.length > 0}
      <hr class="divider" />
      <section class="friends-section" data-section="sent-requests">
        <button
          type="button"
          class="section-toggle section-header"
          aria-expanded={sentOpen}
          onclick={() => toggleSection('sent')}
        >
          <span>{i18n.t('friends.requests.sent')} ({visibleSent.length})</span>
          <span class="section-chevron" aria-hidden="true">{sentOpen ? '▾' : '▸'}</span>
        </button>
        {#if sentOpen}
          <div class="flat-list section-body">
            {#each visibleSent as request (request.friendshipId)}
              <div class="flat-list-item">
                <span>{request.displayName}</span>
                <button class="text-link" disabled={loadingRequests.has(request.friendshipId)} onclick={() => handleCancelRequest(request.friendshipId)}>{i18n.t('friends.action.cancel')}</button>
              </div>
            {/each}
          </div>
        {/if}
      </section>
    {/if}

    <hr class="divider" />

    <!-- Online Friends -->
    <section class="friends-section" data-section="online-friends">
      <button
        type="button"
        class="section-toggle section-header"
        aria-expanded={onlineOpen}
        onclick={() => toggleSection('online')}
      >
        <span>{i18n.t('friends.section.online')} ({onlineFriends.length})</span>
        <span class="section-chevron" aria-hidden="true">{onlineOpen ? '▾' : '▸'}</span>
      </button>
      {#if onlineOpen && onlineFriends.length > 0}
        <div class="flat-list friend-card-list section-body">
          {#each onlineFriends as friend (friend.friendshipId)}
            <div class="flat-list-item friend-card">
              <div class="friend-summary">
                <span class="status-dot online"></span>
                <span class="friend-name">{friend.displayName}</span>
                <span class="friend-rating">{friend.rating != null ? String(friend.rating) + ((friend.ratingGamesPlayed ?? 0) < 30 ? '?' : '') : i18n.t('profile.rating.unrated')}</span>
              </div>
              <div class="actions friend-actions">
                {#if challengePending.has(friend.userId)}
                  <span class="text-secondary">{i18n.t('invitation.action.invited')}</span>
                {:else}
                  <button
                    class="text-link"
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
    </section>

    <hr class="divider" />

    <!-- Offline Friends -->
    <section class="friends-section" data-section="offline-friends">
      <button
        type="button"
        class="section-toggle section-header"
        aria-expanded={offlineOpen}
        onclick={() => toggleSection('offline')}
      >
        <span>{i18n.t('friends.section.offline')} ({offlineFriends.length})</span>
        <span class="section-chevron" aria-hidden="true">{offlineOpen ? '▾' : '▸'}</span>
      </button>
      {#if offlineOpen && offlineFriends.length > 0}
        <div class="flat-list friend-card-list section-body">
          {#each offlineFriends as friend (friend.friendshipId)}
            <div class="flat-list-item friend-card">
              <div class="friend-summary">
                <span class="status-dot offline"></span>
                <span class="friend-name">{friend.displayName}</span>
                <span class="friend-rating">{friend.rating != null ? String(friend.rating) + ((friend.ratingGamesPlayed ?? 0) < 30 ? '?' : '') : i18n.t('profile.rating.unrated')}</span>
              </div>
              <div class="actions friend-actions">
                <button
                  class="text-link"
                  disabled
                >
                  {i18n.t('friend.challenge.action.challenge')}
                </button>
                <button class="text-link danger" onclick={() => openRemoveDialog(friend)}>
                  {i18n.t('friends.remove.button')}
                </button>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </section>
    {#if allFriends.length === 0}
      <span class="text-secondary">{i18n.t('friends.empty.title')}</span>
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

  .friends-section {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .text-secondary {
    color: var(--theme-text-secondary, #aaa);
    font-size: 0.8125rem;
  }

  .section-toggle {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    width: 100%;
    padding: 0;
    border: 0;
    background: transparent;
    color: inherit;
    text-align: left;
    cursor: pointer;
  }

  .section-body {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .section-chevron {
    color: var(--theme-text-secondary, #aaa);
    font-size: 0.875rem;
    line-height: 1;
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

  .friend-card-list {
    gap: 0.75rem;
  }

  .friend-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
  }

  .friend-summary {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    min-width: 0;
    flex: 1;
  }

  .friend-actions {
    flex-shrink: 0;
  }

  .friend-name {
    flex: 1;
    font-size: 0.875rem;
    color: var(--theme-text-primary, #eee);
  }

  .friend-rating {
    font-size: 0.75rem;
    color: var(--theme-text-secondary, #aaa);
    font-family: var(--font-mono);
    margin-right: 0.5rem;
  }

  .online {
    background: var(--color-player-online, #22c55e) !important;
  }

  .danger {
    color: #ef4444;
  }

  @media (max-width: 768px) {
    .friend-card {
      align-items: flex-start;
      flex-direction: column;
      padding: 0.75rem;
      border: 1px solid var(--theme-border, #333);
      background: var(--theme-bg-panel, #1a1a1a);
    }

    .friend-summary {
      width: 100%;
      align-items: baseline;
      flex-wrap: wrap;
    }

    .friend-actions {
      width: 100%;
      flex-wrap: wrap;
      justify-content: flex-start;
    }
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
