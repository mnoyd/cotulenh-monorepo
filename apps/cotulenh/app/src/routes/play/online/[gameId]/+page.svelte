<script lang="ts">
  import { getI18n } from '$lib/i18n/index.svelte';
  import { Swords } from 'lucide-svelte';
  import type { PageData } from './$types';

  const i18n = getI18n();

  let { data }: { data: PageData } = $props();

  let timeLabel = $derived(
    data.game.timeControl.incrementSeconds > 0
      ? `${data.game.timeControl.timeMinutes}+${data.game.timeControl.incrementSeconds}`
      : `${data.game.timeControl.timeMinutes}+0`
  );

  let colorLabel = $derived(
    data.playerColor === 'red' ? i18n.t('common.red') : i18n.t('common.blue')
  );
</script>

<svelte:head>
  <title>{i18n.t('game.pageTitle')} | {i18n.t('nav.appName')}</title>
</svelte:head>

<div class="game-page">
  <div class="game-container">
    <div class="game-header">
      <Swords size={32} class="game-icon" />
      <h1 class="game-title">{i18n.t('game.starting')}</h1>
    </div>

    <div class="game-info">
      <div class="info-row">
        <span class="info-label">{i18n.t('game.opponent')}</span>
        <span class="info-value">{data.opponent.displayName}</span>
      </div>
      <div class="info-row">
        <span class="info-label">{i18n.t('game.yourColor')}</span>
        <span class="info-value color-badge {data.playerColor}">{colorLabel}</span>
      </div>
      <div class="info-row">
        <span class="info-label">{i18n.t('invitation.timeControl.title')}</span>
        <span class="info-value mono">{timeLabel}</span>
      </div>
    </div>

    <p class="game-placeholder">{i18n.t('game.placeholderMessage')}</p>
  </div>
</div>

<style>
  .game-page {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 2rem 1rem;
    min-height: 100vh;
  }

  .game-container {
    width: 100%;
    max-width: 480px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.5rem;
    text-align: center;
  }

  .game-header {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
  }

  :global(.game-icon) {
    color: var(--theme-primary, #06b6d4);
  }

  .game-title {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--theme-text-primary, #eee);
    margin: 0;
  }

  .game-info {
    width: 100%;
    background: var(--theme-bg-panel, #222);
    border: 1px solid var(--theme-border, #444);
    border-radius: 8px;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .info-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .info-label {
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--theme-text-secondary, #aaa);
  }

  .info-value {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--theme-text-primary, #eee);
  }

  .info-value.mono {
    font-family: var(--font-mono);
  }

  .color-badge {
    padding: 0.125rem 0.5rem;
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
  }

  .color-badge.red {
    background: rgba(239, 68, 68, 0.2);
    color: #ef4444;
  }

  .color-badge.blue {
    background: rgba(59, 130, 246, 0.2);
    color: #3b82f6;
  }

  .game-placeholder {
    font-size: 0.875rem;
    color: var(--theme-text-secondary, #aaa);
    margin: 0;
    line-height: 1.5;
  }
</style>
