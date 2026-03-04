<script lang="ts">
  import { getI18n } from '$lib/i18n/index.svelte';
  import type { TranslationKey } from '$lib/i18n/types';
  import { User, Trophy, Swords, XCircle, Clock } from 'lucide-svelte';
  import type { PageData } from './$types';
  import type { GameHistoryItem } from '$lib/game/history';
  import {
    getGameResult,
    getDurationParts,
    getGameHistoryReasonKey
  } from '$lib/game/history';

  const i18n = getI18n();

  let { data }: { data: PageData } = $props();

  function formatMemberSince(dateStr: string): string {
    const date = new Date(dateStr);
    const formatted = date.toLocaleDateString(i18n.getLocale() === 'vi' ? 'vi-VN' : 'en-US', {
      month: 'long',
      year: 'numeric'
    });
    return i18n.t('profile.memberSince').replace('{date}', formatted);
  }

  const pageTitle = $derived(
    i18n.t('profile.public.title').replace('{username}', data.profileDetail.displayName)
  );

  const displayGames = $derived((data.games ?? []).slice(0, 10));

  function getResultLabel(result: 'win' | 'loss' | 'draw' | 'aborted'): string {
    const key = `gameHistory.result.${result}` as TranslationKey;
    return i18n.t(key);
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
    return i18n.t(key);
  }

  function getDurationLabel(game: GameHistoryItem): string {
    const duration = getDurationParts(game.startedAt, game.endedAt);
    if (!duration) return '—';
    return i18n
      .t('gameHistory.duration')
      .replace('{minutes}', String(duration.minutes))
      .replace('{seconds}', String(duration.seconds));
  }

  function formatDate(dateStr: string | null): string {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    return date.toLocaleDateString(i18n.getLocale() === 'vi' ? 'vi-VN' : 'en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }
</script>

<svelte:head>
  <title>{pageTitle}</title>
</svelte:head>

<div class="profile-page">
  <div class="profile-container">
    <h1 class="profile-title">{pageTitle}</h1>

    <div class="profile-layout">
      <!-- Left Panel: Identity -->
      <div class="profile-identity-card">
        <div class="avatar-placeholder" aria-hidden="true">
          <User size={48} />
        </div>

        <div class="display-name-row">
          <span class="display-name-text">{data.profileDetail.displayName}</span>
        </div>

        <p class="member-since">{formatMemberSince(data.profileDetail.createdAt)}</p>
      </div>

      <!-- Right Panel: Stats + Game History -->
      <div class="profile-right-panel">
        <div class="profile-stats-card">
          <h2 class="stats-title">{i18n.t('profile.stats.title')}</h2>
          <div class="stats-grid">
            <div class="stat-item">
              <Swords size={20} class="stat-icon" />
              <span class="stat-value">{data.stats.gamesPlayed}</span>
              <span class="stat-label">{i18n.t('profile.stats.gamesPlayed')}</span>
            </div>
            <div class="stat-item">
              <Trophy size={20} class="stat-icon" />
              <span class="stat-value">{data.stats.wins}</span>
              <span class="stat-label">{i18n.t('profile.stats.wins')}</span>
            </div>
            <div class="stat-item">
              <XCircle size={20} class="stat-icon" />
              <span class="stat-value">{data.stats.losses}</span>
              <span class="stat-label">{i18n.t('profile.stats.losses')}</span>
            </div>
          </div>
        </div>

        <!-- Game History (AC3) -->
        <div class="profile-history-card">
          <h2 class="history-title">{i18n.t('profile.public.gameHistory.title')}</h2>
          {#if displayGames.length === 0}
            <div class="history-empty">
              <Clock size={32} class="history-empty-icon" />
              <p class="history-empty-text">{i18n.t('profile.public.gameHistory.empty')}</p>
            </div>
          {:else}
            <div class="profile-game-list">
              {#each displayGames as game (game.id)}
                {@const result = getGameResult(game)}
                <a href="/user/history/{game.id}" class="profile-game-row">
                  <div class="profile-game-left">
                    <span class="color-dot" class:red={game.playerColor === 'red'} class:blue={game.playerColor === 'blue'}></span>
                    <div class="profile-game-info">
                      <span class="profile-game-opponent">{i18n.t('gameHistory.vs')} {game.opponentDisplayName}</span>
                      <span class="profile-game-meta">{formatDate(game.endedAt ?? game.startedAt)} · {getDurationLabel(game)}</span>
                    </div>
                  </div>
                  <div class="profile-game-right">
                    <span class="profile-game-result" style="color: {getResultColor(result)}">{getResultLabel(result)}</span>
                    {#if getReasonLabel(game)}
                      <span class="profile-game-reason">{getReasonLabel(game)}</span>
                    {/if}
                  </div>
                </a>
              {/each}
            </div>
            {#if data.canViewAll && (data.games ?? []).length > 10}
              <div class="view-all-row">
                <a href="/user/history" class="view-all-link">{i18n.t('gameHistory.viewAll')}</a>
              </div>
            {/if}
          {/if}
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  .profile-page {
    display: flex;
    justify-content: center;
    padding: 2rem 1rem;
    min-height: 100vh;
  }

  .profile-container {
    width: 100%;
    max-width: 1200px;
  }

  .profile-title {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--theme-text-primary, #eee);
    margin: 0 0 1.5rem;
  }

  .profile-layout {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  @media (min-width: 768px) {
    .profile-layout {
      flex-direction: row;
    }

    .profile-identity-card {
      flex: 0 0 30%;
    }

    .profile-right-panel {
      flex: 1;
    }
  }

  .profile-identity-card,
  .profile-stats-card,
  .profile-history-card {
    background: var(--theme-bg-panel, #222);
    border: 1px solid var(--theme-border, #444);
    border-radius: 12px;
    padding: 1.5rem;
  }

  .profile-right-panel {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .avatar-placeholder {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    background: var(--theme-bg-dark, #111);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--theme-text-secondary, #aaa);
    margin: 0 auto 1rem;
  }

  .display-name-row {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
  }

  .display-name-text {
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--theme-text-primary, #eee);
  }

  .member-since {
    text-align: center;
    font-size: 0.875rem;
    color: var(--theme-text-secondary, #aaa);
    margin: 0.75rem 0 0;
  }

  .stats-title {
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--theme-text-primary, #eee);
    margin: 0 0 1rem;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem;
  }

  @media (max-width: 480px) {
    .stats-grid {
      grid-template-columns: 1fr;
    }
  }

  .stat-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
    padding: 1rem;
    background: var(--theme-bg-dark, #111);
    border-radius: 8px;
  }

  :global(.stat-icon) {
    color: var(--theme-text-secondary, #aaa);
  }

  .stat-value {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--theme-text-primary, #eee);
  }

  .stat-label {
    font-size: 0.75rem;
    color: var(--theme-text-secondary, #aaa);
    text-align: center;
  }

  .history-title {
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--theme-text-primary, #eee);
    margin: 0 0 1rem;
  }

  .history-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    padding: 2rem 1rem;
  }

  :global(.history-empty-icon) {
    color: var(--theme-text-secondary, #aaa);
  }

  .history-empty-text {
    font-size: 0.875rem;
    color: var(--theme-text-secondary, #aaa);
    margin: 0;
    text-align: center;
  }

  /* Game History List */
  .profile-game-list {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
  }

  .profile-game-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    padding: 0.625rem 0.75rem;
    background: var(--theme-bg-dark, #111);
    border-radius: 8px;
    text-decoration: none;
    color: inherit;
    min-height: 44px;
    transition: background-color 0.15s;
  }

  .profile-game-row:hover {
    background: var(--theme-bg-elevated, #1a1a1a);
  }

  .profile-game-row:focus-visible {
    outline: 2px solid var(--theme-primary, #06b6d4);
    outline-offset: 2px;
  }

  .profile-game-left {
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

  .color-dot.red {
    background: #ef4444;
  }

  .color-dot.blue {
    background: #3b82f6;
  }

  .profile-game-info {
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
    min-width: 0;
  }

  .profile-game-opponent {
    font-size: 0.8125rem;
    font-weight: 600;
    color: var(--theme-text-primary, #eee);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .profile-game-meta {
    font-size: 0.6875rem;
    color: var(--theme-text-secondary, #aaa);
  }

  .profile-game-right {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.1rem;
    flex-shrink: 0;
  }

  .profile-game-result {
    font-size: 0.8125rem;
    font-weight: 700;
  }

  .profile-game-reason {
    font-size: 0.625rem;
    color: var(--theme-text-secondary, #aaa);
  }

  .view-all-row {
    padding: 0.75rem 0 0;
    text-align: center;
  }

  .view-all-link {
    font-size: 0.8125rem;
    font-weight: 600;
    color: var(--theme-primary, #06b6d4);
    text-decoration: none;
    padding: 0.5rem 1rem;
    border-radius: 8px;
    min-height: 44px;
    display: inline-flex;
    align-items: center;
  }

  .view-all-link:hover {
    text-decoration: underline;
  }

  .view-all-link:focus-visible {
    outline: 2px solid var(--theme-primary, #06b6d4);
    outline-offset: 2px;
  }
</style>
