<script lang="ts">
  import { getI18n } from '$lib/i18n/index.svelte';
  import type { TranslationKey } from '$lib/i18n/types';
  import CommandCenter from '$lib/components/CommandCenter.svelte';
  import type { PageData } from './$types';
  import type { GameHistoryItem } from '$lib/game/history';
  import {
    getGameResult,
    getDurationParts,
    getGameHistoryReasonKey
  } from '$lib/game/history';

  import '$lib/styles/command-center.css';

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

<CommandCenter center={centerContent} />

{#snippet centerContent()}
  <div class="public-profile-center">
    <h1 class="section-header">{data.profileDetail.displayName}</h1>
    <span class="text-secondary">{formatMemberSince(data.profileDetail.createdAt)}</span>

    <hr class="divider" />

    <span class="section-header">{i18n.t('profile.stats.title')}</span>
    <div class="stats">
      <div class="stat-row">
        <span class="text-secondary">{i18n.t('profile.stats.gamesPlayed')}</span>
        <span class="stat-value">{data.stats.gamesPlayed}</span>
      </div>
      <div class="stat-row">
        <span class="text-secondary">{i18n.t('profile.stats.wins')}</span>
        <span class="stat-value">{data.stats.wins}</span>
      </div>
      <div class="stat-row">
        <span class="text-secondary">{i18n.t('profile.stats.losses')}</span>
        <span class="stat-value">{data.stats.losses}</span>
      </div>
    </div>

    <hr class="divider" />

    <span class="section-header">{i18n.t('profile.public.gameHistory.title')}</span>
    {#if displayGames.length === 0}
      <span class="text-secondary">{i18n.t('profile.public.gameHistory.empty')}</span>
    {:else}
      <div class="flat-list">
        {#each displayGames as game (game.id)}
          {@const result = getGameResult(game)}
          <a href="/user/history/{game.id}" class="game-row">
            <div class="game-left">
              <span class="color-dot" class:red={game.playerColor === 'red'} class:blue={game.playerColor === 'blue'}></span>
              <span class="opponent">{i18n.t('gameHistory.vs')} {game.opponentDisplayName}</span>
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
      {#if data.canViewAll && (data.games ?? []).length > 10}
        <a href="/user/history" class="text-link">{i18n.t('gameHistory.viewAll')}</a>
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
</style>
