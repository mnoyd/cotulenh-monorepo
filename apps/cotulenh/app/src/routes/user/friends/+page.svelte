<script lang="ts">
  import { getI18n } from '$lib/i18n/index.svelte';
  import type { TranslationKey } from '$lib/i18n/types';
  import type { FriendSearchResult, PendingRequestItem } from '$lib/friends/types';
  import PlayerCard from '$lib/components/PlayerCard.svelte';
  import FriendRequestCard from '$lib/components/FriendRequestCard.svelte';
  import { Search, Loader2, Users } from 'lucide-svelte';
  import Button from '$lib/components/ui/button/button.svelte';
  import { toast } from 'svelte-sonner';
  import type { PageData } from './$types';

  const i18n = getI18n();

  let { data }: { data: PageData } = $props();

  // Search state
  let searchQuery = $state('');
  let searchResults = $state<FriendSearchResult[]>([]);
  let isSearching = $state(false);
  let hasSearched = $state(false);
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  // Optimistic pending set — track IDs we've sent requests to
  let optimisticPending = $state(new Set<string>());

  // Optimistic removal sets for request management
  let removedIncoming = $state(new Set<string>());
  let removedSent = $state(new Set<string>());
  let loadingRequests = $state(new Set<string>());

  // Optimistic accepted — friends added from accepted requests
  let optimisticFriends = $state<Array<{ friendshipId: string; userId: string; displayName: string }>>([]);

  // Derived filtered lists
  let visibleIncoming = $derived(
    data.incomingRequests.filter((r: PendingRequestItem) => !removedIncoming.has(r.friendshipId))
  );
  let visibleSent = $derived(
    data.sentRequests.filter((r: PendingRequestItem) => !removedSent.has(r.friendshipId))
  );
  let allFriends = $derived([...data.friends, ...optimisticFriends]);

  // Click-outside handler to close search dropdown
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
      searchResults = [];
      hasSearched = false;
      showDropdown = false;
      return;
    }

    showDropdown = true;
    debounceTimer = setTimeout(async () => {
      isSearching = true;
      try {
        const response = await fetch('?/search', {
          method: 'POST',
          body: new URLSearchParams({ query: searchQuery.trim() })
        });
        const result = await response.json();
        const actionData = result?.data;
        if (actionData && Array.isArray(actionData)) {
          searchResults = actionData;
        } else if (Array.isArray(actionData?.results)) {
          searchResults = actionData.results;
        } else {
          searchResults = result?.data?.results ?? [];
        }
        hasSearched = true;
      } catch {
        searchResults = [];
        hasSearched = true;
      } finally {
        isSearching = false;
      }
    }, 300);
  }

  async function handleSendRequest(toUserId: string) {
    optimisticPending = new Set([...optimisticPending, toUserId]);

    try {
      const response = await fetch('?/sendRequest', {
        method: 'POST',
        body: new URLSearchParams({ toUserId })
      });

      if (!response.ok) {
        const next = new Set(optimisticPending);
        next.delete(toUserId);
        optimisticPending = next;
        toast.error(i18n.t('friends.toast.requestFailed'));
        return;
      }

      toast.success(i18n.t('friends.toast.requestSent'), { duration: 4000 });
    } catch {
      const next = new Set(optimisticPending);
      next.delete(toUserId);
      optimisticPending = next;
      toast.error(i18n.t('friends.toast.requestFailed'));
    }
  }

  async function handleAcceptRequest(friendshipId: string) {
    loadingRequests = new Set([...loadingRequests, friendshipId]);

    // Find the request to get display name for optimistic friend addition
    const request = data.incomingRequests.find((r: PendingRequestItem) => r.friendshipId === friendshipId);

    try {
      const response = await fetch('?/acceptRequest', {
        method: 'POST',
        body: new URLSearchParams({ friendshipId })
      });

      if (!response.ok) {
        toast.error(i18n.t('friends.toast.actionFailed'));
        return;
      }

      // Optimistic: remove from incoming, add to friends
      removedIncoming = new Set([...removedIncoming, friendshipId]);
      if (request) {
        optimisticFriends = [...optimisticFriends, {
          friendshipId,
          userId: request.userId,
          displayName: request.displayName
        }];
      }
      toast.success(i18n.t('friends.toast.requestAccepted'), { duration: 4000 });
    } catch {
      toast.error(i18n.t('friends.toast.actionFailed'));
    } finally {
      const next = new Set(loadingRequests);
      next.delete(friendshipId);
      loadingRequests = next;
    }
  }

  async function handleDeclineRequest(friendshipId: string) {
    loadingRequests = new Set([...loadingRequests, friendshipId]);

    try {
      const response = await fetch('?/declineRequest', {
        method: 'POST',
        body: new URLSearchParams({ friendshipId })
      });

      if (!response.ok) {
        toast.error(i18n.t('friends.toast.actionFailed'));
        return;
      }

      removedIncoming = new Set([...removedIncoming, friendshipId]);
      toast.success(i18n.t('friends.toast.requestDeclined'), { duration: 4000 });
    } catch {
      toast.error(i18n.t('friends.toast.actionFailed'));
    } finally {
      const next = new Set(loadingRequests);
      next.delete(friendshipId);
      loadingRequests = next;
    }
  }

  async function handleCancelRequest(friendshipId: string) {
    loadingRequests = new Set([...loadingRequests, friendshipId]);

    try {
      const response = await fetch('?/cancelRequest', {
        method: 'POST',
        body: new URLSearchParams({ friendshipId })
      });

      if (!response.ok) {
        toast.error(i18n.t('friends.toast.actionFailed'));
        return;
      }

      removedSent = new Set([...removedSent, friendshipId]);
      toast.success(i18n.t('friends.toast.requestCancelled'), { duration: 4000 });
    } catch {
      toast.error(i18n.t('friends.toast.actionFailed'));
    } finally {
      const next = new Set(loadingRequests);
      next.delete(friendshipId);
      loadingRequests = next;
    }
  }

  function getButtonLabel(result: FriendSearchResult): TranslationKey {
    if (optimisticPending.has(result.id)) return 'friends.action.pending';
    if (result.relationship === 'accepted') return 'friends.action.friends';
    if (result.relationship === 'pending_sent') return 'friends.action.pending';
    if (result.relationship === 'pending_received') return 'friends.action.pending';
    return 'friends.action.sendRequest';
  }

  function isActionDisabled(result: FriendSearchResult): boolean {
    return (
      optimisticPending.has(result.id) ||
      result.relationship === 'accepted' ||
      result.relationship === 'pending_sent' ||
      result.relationship === 'pending_received'
    );
  }
</script>

<svelte:head>
  <title>{i18n.t('friends.title')} | {i18n.t('nav.appName')}</title>
</svelte:head>

<div class="friends-page">
  <div class="friends-container">
    <h1 class="friends-title">{i18n.t('friends.title')}</h1>

    <!-- Search Section -->
    <section class="search-section" aria-label={i18n.t('friends.search.placeholder')} bind:this={searchSectionEl}>
      <div class="search-input-wrapper">
        <Search size={18} class="search-icon" />
        <input
          type="text"
          class="search-input"
          placeholder={i18n.t('friends.search.placeholder')}
          bind:value={searchQuery}
          oninput={debounceSearch}
          aria-label={i18n.t('friends.search.placeholder')}
        />
        {#if isSearching}
          <Loader2 size={18} class="search-spinner animate-spin" />
        {/if}
      </div>

      <!-- Screen reader announcement for search results -->
      <div class="sr-only" aria-live="polite" aria-atomic="true">
        {#if hasSearched && !isSearching}
          {#if searchResults.length === 0}
            {i18n.t('friends.search.noResults')}
          {:else}
            {searchResults.length} {i18n.t('friends.search.resultsFound')}
          {/if}
        {/if}
      </div>

      <!-- Search Results Dropdown -->
      {#if showDropdown && searchQuery.trim().length >= 2}
        <div class="search-results" role="listbox" aria-label={i18n.t('friends.search.resultsLabel')}>
          {#if isSearching}
            <div class="search-status">{i18n.t('common.loading')}</div>
          {:else if hasSearched && searchResults.length === 0}
            <div class="search-empty">
              <p class="search-empty-title">{i18n.t('friends.search.noResults')}</p>
              <p class="search-empty-hint">{i18n.t('friends.search.noResultsHint')}</p>
            </div>
          {:else}
            {#each searchResults as result (result.id)}
              <div class="search-result-item" role="option" aria-selected="false">
                <PlayerCard displayName={result.displayName}>
                  <Button
                    size="sm"
                    disabled={isActionDisabled(result)}
                    onclick={() => handleSendRequest(result.id)}
                  >
                    {#if optimisticPending.has(result.id)}
                      <Loader2 size={14} class="animate-spin" />
                    {/if}
                    {i18n.t(getButtonLabel(result))}
                  </Button>
                </PlayerCard>
              </div>
            {/each}
          {/if}
        </div>
      {/if}
    </section>

    <!-- Pending Incoming Requests Section -->
    {#if visibleIncoming.length > 0}
      <section class="requests-section" aria-labelledby="incoming-requests-heading">
        <h2 id="incoming-requests-heading" class="section-title">
          {i18n.t('friends.requests.incoming')} ({visibleIncoming.length})
        </h2>
        <div class="requests-list">
          {#each visibleIncoming as request (request.friendshipId)}
            <FriendRequestCard
              displayName={request.displayName}
              friendshipId={request.friendshipId}
              direction="incoming"
              loading={loadingRequests.has(request.friendshipId)}
              onaccept={handleAcceptRequest}
              ondecline={handleDeclineRequest}
            />
          {/each}
        </div>
      </section>
    {/if}

    <!-- Sent Requests Section -->
    {#if visibleSent.length > 0}
      <section class="requests-section" aria-labelledby="sent-requests-heading">
        <h2 id="sent-requests-heading" class="section-title">
          {i18n.t('friends.requests.sent')} ({visibleSent.length})
        </h2>
        <div class="requests-list">
          {#each visibleSent as request (request.friendshipId)}
            <FriendRequestCard
              displayName={request.displayName}
              friendshipId={request.friendshipId}
              direction="sent"
              loading={loadingRequests.has(request.friendshipId)}
              oncancel={handleCancelRequest}
            />
          {/each}
        </div>
      </section>
    {/if}

    <!-- Friends List Section -->
    <section class="friends-list-section" aria-labelledby="friends-list-heading">
      {#if allFriends.length === 0 && visibleIncoming.length === 0 && visibleSent.length === 0}
        <div class="empty-state">
          <Users size={48} class="empty-icon" />
          <h2 class="empty-title">{i18n.t('friends.empty.title')}</h2>
          <p class="empty-subtitle">{i18n.t('friends.empty.subtitle')}</p>
        </div>
      {:else if allFriends.length > 0}
        <h2 id="friends-list-heading" class="section-title">
          {i18n.t('friends.list.title')} ({allFriends.length})
        </h2>
        <div class="friends-grid">
          {#each allFriends as friend (friend.friendshipId)}
            <PlayerCard displayName={friend.displayName} />
          {/each}
        </div>
      {/if}
    </section>
  </div>
</div>

<style>
  .friends-page {
    display: flex;
    justify-content: center;
    padding: 2rem 1rem;
    min-height: 100vh;
  }

  .friends-container {
    width: 100%;
    max-width: 800px;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .friends-title {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--theme-text-primary, #eee);
    margin: 0;
  }

  /* Search */
  .search-section {
    position: relative;
  }

  .search-input-wrapper {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0 0.75rem;
    height: 48px;
    background: var(--theme-bg-panel, #222);
    border: 1px solid var(--theme-border, #444);
    border-radius: 8px;
    transition: border-color 0.15s;
  }

  .search-input-wrapper:focus-within {
    border-color: var(--theme-primary, #06b6d4);
    outline: 2px solid var(--theme-primary, #06b6d4);
    outline-offset: 2px;
  }

  :global(.search-icon) {
    color: var(--theme-text-secondary, #aaa);
    flex-shrink: 0;
  }

  :global(.search-spinner) {
    color: var(--theme-primary, #06b6d4);
    flex-shrink: 0;
  }

  .search-input {
    flex: 1;
    background: transparent;
    border: none;
    outline: none;
    color: var(--theme-text-primary, #eee);
    font-size: 0.875rem;
    height: 100%;
  }

  .search-input::placeholder {
    color: var(--theme-text-secondary, #666);
  }

  .search-results {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    right: 0;
    background: var(--theme-bg-panel, #222);
    border: 1px solid var(--theme-border, #444);
    border-radius: 8px;
    max-height: 400px;
    overflow-y: auto;
    z-index: 50;
    padding: 0.5rem;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .search-result-item {
    border-radius: 6px;
  }

  .search-status {
    padding: 1rem;
    text-align: center;
    color: var(--theme-text-secondary, #aaa);
    font-size: 0.875rem;
  }

  .search-empty {
    padding: 1.5rem;
    text-align: center;
  }

  .search-empty-title {
    color: var(--theme-text-primary, #eee);
    font-weight: 600;
    font-size: 0.875rem;
    margin: 0 0 0.25rem;
  }

  .search-empty-hint {
    color: var(--theme-text-secondary, #aaa);
    font-size: 0.75rem;
    margin: 0;
  }

  /* Request Sections */
  .requests-section {
    margin-top: 0.25rem;
  }

  .requests-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  /* Friends List */
  .friends-list-section {
    margin-top: 0.5rem;
  }

  .section-title {
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--theme-text-secondary, #aaa);
    margin: 0 0 0.75rem;
  }

  .friends-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 0.5rem;
  }

  /* Empty State */
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    padding: 3rem 1rem;
    text-align: center;
  }

  :global(.empty-icon) {
    color: var(--theme-text-secondary, #666);
  }

  .empty-title {
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--theme-text-primary, #eee);
    margin: 0;
  }

  .empty-subtitle {
    font-size: 0.875rem;
    color: var(--theme-text-secondary, #aaa);
    margin: 0;
  }

  /* Responsive */
  @media (min-width: 768px) {
    .friends-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (min-width: 1024px) {
    .friends-grid {
      grid-template-columns: repeat(3, 1fr);
    }
  }

  @media (max-width: 767px) {
    .friends-page {
      padding: 1rem 0.5rem;
    }
  }

  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border-width: 0;
  }

  :global(.animate-spin) {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
</style>
