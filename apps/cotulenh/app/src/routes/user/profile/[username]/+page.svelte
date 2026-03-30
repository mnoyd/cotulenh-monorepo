<script lang="ts">
  import { navigating } from '$app/stores';
  import type { TranslationKey } from '$lib/i18n/types';
  import { vi } from '$lib/i18n/locales/vi';
  import CommandCenter from '$lib/components/CommandCenter.svelte';
  import FriendChallengeDialog from '$lib/components/FriendChallengeDialog.svelte';
  import { isUserOnline } from '$lib/friends/presence.svelte';
  import type { RelationshipStatus } from '$lib/friends/types';
  import { toast } from 'svelte-sonner';
  import type { PageData } from './$types';
  import type { GameHistoryItem } from '$lib/game/history';
  import type { GameConfig } from '$lib/invitations/types';
  import {
    getGameResult,
    getDurationParts,
    getGameHistoryReasonKey
  } from '$lib/game/history';

  import '$lib/styles/command-center.css';

  function t(key: TranslationKey): string {
    return vi[key] ?? key;
  }

  let { data }: { data: PageData } = $props();

  let addFriendPending = $state(false);
  let challengePending = $state(false);
  let challengeDialogOpen = $state(false);
  let relationship = $state<RelationshipStatus>('none');
  let isLoading = $derived(Boolean($navigating));

  $effect(() => {
    relationship = data.relationship;
    addFriendPending = false;
    challengePending = false;
  });

  const profileOnline = $derived(
    data.profileDetail.id ? isUserOnline(data.profileDetail.id) : false
  );
  const showAddFriend = $derived(
    !data.isOwnProfile &&
    data.currentUserId &&
    relationship === 'none'
  );
  const showPendingSent = $derived(
    !data.isOwnProfile &&
    data.currentUserId &&
    relationship === 'pending_sent'
  );
  const showChallenge = $derived(
    !data.isOwnProfile &&
    data.currentUserId &&
    !challengePending &&
    profileOnline
  );

  function formatMemberSince(dateStr: string): string {
    const date = new Date(dateStr);
    const formatted = new Intl.DateTimeFormat('vi-VN', {
      month: 'long',
      year: 'numeric'
    }).format(date);
    return t('profile.memberSince').replace('{date}', formatted);
  }

  const pageTitle = $derived(
    t('profile.public.title').replace('{username}', data.profileDetail.displayName)
  );

  const ratingDisplay = $derived(
    data.profileDetail.rating != null
      ? String(data.profileDetail.rating) + (data.profileDetail.ratingGamesPlayed < 30 ? '?' : '')
      : t('profile.rating.unrated')
  );

  const displayGames = $derived((data.games ?? []).slice(0, 10));

  function getResultLabel(result: 'win' | 'loss' | 'draw' | 'aborted'): string {
    const key = `gameHistory.result.${result}` as TranslationKey;
    return t(key);
  }

  function getResultColor(result: 'win' | 'loss' | 'draw' | 'aborted'): string {
    switch (result) {
      case 'win': return '#22c55e';
      case 'loss': return 'var(--theme-text-primary, #eee)';
      case 'draw': return '#f59e0b';
      case 'aborted': return 'var(--theme-text-secondary, #aaa)';
    }
  }

  function getReasonLabel(game: GameHistoryItem): string {
    const key = getGameHistoryReasonKey(game.resultReason);
    if (!key) return '';
    return t(key);
  }

  function getDurationLabel(game: GameHistoryItem): string {
    const duration = getDurationParts(game.startedAt, game.endedAt);
    if (!duration) return '—';
    return t('gameHistory.duration')
      .replace('{minutes}', String(duration.minutes))
      .replace('{seconds}', String(duration.seconds));
  }

  function formatDate(dateStr: string | null): string {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    return date.toLocaleDateString('vi-VN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }

  async function postAction(action: string, body: Record<string, string>): Promise<boolean> {
    const response = await fetch(`?/${action}`, {
      method: 'POST',
      body: new URLSearchParams(body),
      headers: { 'x-sveltekit-action': 'true' }
    });
    return response.ok;
  }

  async function handleAddFriend() {
    addFriendPending = true;
    try {
      const ok = await postAction('sendRequest', { toUserId: data.profileDetail.id });
      if (!ok) {
        addFriendPending = false;
        toast.error(t('friends.toast.requestFailed'));
        return;
      }
      relationship = 'pending_sent';
      addFriendPending = false;
      toast.success(t('friends.toast.requestSent'), { duration: 4000 });
    } catch {
      addFriendPending = false;
      toast.error(t('friends.toast.requestFailed'));
    }
  }

  async function handleSendChallenge(config: GameConfig & { toUserId: string }) {
    const { toUserId, ...gameConfig } = config;
    challengePending = true;
    try {
      const ok = await postAction('sendChallenge', {
        toUserId,
        gameConfig: JSON.stringify(gameConfig)
      });
      if (!ok) {
        challengePending = false;
        toast.error(t('invitation.toast.sendFailed'));
        return;
      }
      toast.success(t('invitation.toast.sent'), { duration: 4000 });
    } catch {
      challengePending = false;
      toast.error(t('invitation.toast.sendFailed'));
    }
  }
</script>

<svelte:head>
  <title>{pageTitle}</title>
</svelte:head>

<FriendChallengeDialog
  bind:open={challengeDialogOpen}
  friend={{
    id: data.profileDetail.id,
    displayName: data.profileDetail.displayName,
    rating: data.profileDetail.rating ?? undefined,
    ratingGamesPlayed: data.profileDetail.ratingGamesPlayed
  }}
  onsubmit={handleSendChallenge}
  translate={t}
/>

<CommandCenter center={centerContent} loading={isLoading} loadingContent={skeletonContent} />

{#snippet skeletonContent()}
  <div class="public-profile-center">
    <div class="skeleton-bar" style="width: 160px; height: 1.25rem;"></div>
    <div class="skeleton-bar" style="width: 120px; height: 0.8rem;"></div>
    <div class="skeleton-bar" style="width: 80px; height: 0.8rem;"></div>
    <hr class="divider" />
    <div class="skeleton-bar" style="width: 140px; height: 1rem;"></div>
    {#each [1, 2, 3] as _}
      <div class="stat-row">
        <div class="skeleton-bar" style="width: 80px;"></div>
        <div class="skeleton-bar" style="width: 40px;"></div>
      </div>
    {/each}
    <hr class="divider" />
    <div class="skeleton-bar" style="width: 140px; height: 1rem;"></div>
    {#each [1, 2, 3] as _}
      <div class="game-row">
        <div class="skeleton-bar" style="width: 150px;"></div>
        <div class="skeleton-bar" style="width: 60px;"></div>
      </div>
    {/each}
  </div>
{/snippet}

{#snippet centerContent()}
  <div class="public-profile-center">
    <h1 class="section-header">{data.profileDetail.displayName}</h1>
    <span class="text-secondary">{formatMemberSince(data.profileDetail.createdAt)}</span>

    <div class="stat-row">
      <span class="text-secondary">{t('profile.rating')}</span>
      <span class="stat-value">{ratingDisplay}</span>
    </div>

    <!-- Action buttons for other users -->
    {#if !data.isOwnProfile && data.currentUserId}
      <div class="profile-actions">
        {#if showAddFriend}
          <button class="action-btn" onclick={handleAddFriend} disabled={addFriendPending}>
            {t('profile.addFriend')}
          </button>
        {/if}
        {#if showPendingSent}
          <span class="text-secondary">{t('profile.pendingSent')}</span>
        {/if}
        {#if showChallenge}
          <button class="action-btn" onclick={() => challengeDialogOpen = true}>
            {t('profile.challenge')}
          </button>
        {/if}
      </div>
    {/if}

    {#if data.isOwnProfile}
      <a href="/user/settings" class="text-link">{t('profile.settings')}</a>
    {/if}

    <hr class="divider" />

    <span class="section-header">{t('profile.stats.title')}</span>
    <div class="stats">
      <div class="stat-row">
        <span class="text-secondary">{t('profile.stats.gamesPlayed')}</span>
        <span class="stat-value">{data.stats.gamesPlayed}</span>
      </div>
      <div class="stat-row">
        <span class="text-secondary">{t('profile.stats.wins')}</span>
        <span class="stat-value">{data.stats.wins}</span>
      </div>
      <div class="stat-row">
        <span class="text-secondary">{t('profile.stats.losses')}</span>
        <span class="stat-value">{data.stats.losses}</span>
      </div>
    </div>

    <hr class="divider" />

    <span class="section-header">{t('profile.public.gameHistory.title')}</span>
    {#if displayGames.length === 0}
      <span class="text-secondary">{t('profile.public.gameHistory.empty')}</span>
    {:else}
      <div class="flat-list">
        {#each displayGames as game (game.id)}
          {@const result = getGameResult(game)}
          <a href="/user/history/{game.id}" class="game-row">
            <div class="game-left">
              <span class="color-dot" class:red={game.playerColor === 'red'} class:blue={game.playerColor === 'blue'}></span>
              <span class="opponent">{t('gameHistory.vs')} {game.opponentDisplayName}</span>
            </div>
            <div class="game-right">
              <span class="result" style="color: {getResultColor(result)}">{getResultLabel(result)}</span>
              {#if getReasonLabel(game)}
                <span class="reason">{getReasonLabel(game)}</span>
              {/if}
              <span class="date">{formatDate(game.endedAt ?? game.startedAt)}</span>
            </div>
          </a>
        {/each}
      </div>
      {#if data.isOwnProfile && (data.games ?? []).length > 10}
        <a href="/user/history" class="text-link">{t('gameHistory.viewAll')}</a>
      {/if}
    {/if}
  </div>
{/snippet}

<style>
  .public-profile-center {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding-top: 1rem;
  }

  .text-secondary {
    color: var(--theme-text-secondary, #aaa);
    font-size: 0.8125rem;
  }

  .profile-actions {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }

  .action-btn {
    padding: 0.375rem 0.75rem;
    background: var(--theme-primary, #06b6d4);
    color: var(--theme-bg-dark, #111);
    border: none;
    font-size: 0.8125rem;
    font-weight: 600;
    cursor: pointer;
  }

  .action-btn:hover {
    opacity: 0.9;
  }

  .action-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .stats {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .stat-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.125rem 0;
  }

  .stat-value {
    font-family: var(--font-mono, monospace);
    font-size: 0.875rem;
    font-weight: 700;
    color: var(--theme-text-primary, #eee);
  }

  .game-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.375rem 0;
    text-decoration: none;
    color: inherit;
    gap: 0.5rem;
  }

  .game-row:hover {
    background: var(--theme-bg-dark, #111);
  }

  .game-left {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    min-width: 0;
    flex: 1;
  }

  .color-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .color-dot.red { background: #ef4444; }
  .color-dot.blue { background: #3b82f6; }

  .opponent {
    font-size: 0.8125rem;
    font-weight: 600;
    color: var(--theme-text-primary, #eee);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .game-right {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-shrink: 0;
  }

  .result {
    font-size: 0.8125rem;
    font-weight: 700;
  }

  .reason {
    font-size: 0.6875rem;
    color: var(--theme-text-secondary, #aaa);
  }

  .date {
    font-size: 0.6875rem;
    color: var(--theme-text-secondary, #aaa);
  }

  .skeleton-bar {
    background: var(--theme-bg-dark, #222);
    border-radius: 2px;
    height: 0.875rem;
    animation: pulse 1.5s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 0.4; }
    50% { opacity: 0.8; }
  }

  @media (prefers-reduced-motion: reduce) {
    .skeleton-bar {
      animation: none;
      opacity: 0.6;
    }
  }
</style>
