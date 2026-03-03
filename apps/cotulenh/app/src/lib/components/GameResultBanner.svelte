<script lang="ts">
  import { onMount } from 'svelte';
  import { getI18n } from '$lib/i18n/index.svelte';
  import type { GameEndResult } from '$lib/game/online-session-core';

  const i18n = getI18n();

  let {
    result,
    playerColor,
    onPlayAgain
  }: {
    result: GameEndResult;
    playerColor: 'red' | 'blue';
    onPlayAgain?: () => void;
  } = $props();

  let outcomeText = $derived.by(() => {
    if (result.winner === null) return i18n.t('game.gameDraw');
    return result.isLocalPlayerWinner ? i18n.t('game.youWin') : i18n.t('game.youLose');
  });

  let reasonText = $derived.by(() => {
    switch (result.resultReason) {
      case 'checkmate': return i18n.t('game.resultCheckmate');
      case 'commander_captured': return i18n.t('game.resultCommanderCaptured');
      case 'stalemate': return i18n.t('game.resultStalemate');
      case 'resignation': return i18n.t('game.resultResign');
      case 'timeout': return i18n.t('game.resultTimeout');
      default: return i18n.t('game.resultDraw');
    }
  });

  let bannerClass = $derived.by(() => {
    if (result.winner === null) return 'draw';
    return result.isLocalPlayerWinner ? 'win' : 'loss';
  });

  let bannerEl: HTMLDivElement;
  let actionButtons: HTMLButtonElement[] = [];

  function trapFocus(event: KeyboardEvent): void {
    if (event.key !== 'Tab' || actionButtons.length === 0) return;

    const currentIndex = actionButtons.indexOf(document.activeElement as HTMLButtonElement);
    const targetIndex = event.shiftKey
      ? (currentIndex <= 0 ? actionButtons.length - 1 : currentIndex - 1)
      : (currentIndex === -1 || currentIndex === actionButtons.length - 1 ? 0 : currentIndex + 1);

    event.preventDefault();
    actionButtons[targetIndex]?.focus();
  }

  onMount(() => {
    actionButtons = Array.from(
      bannerEl.querySelectorAll<HTMLButtonElement>('button:not([disabled])')
    );
    actionButtons[0]?.focus();
  });
</script>

<div
  bind:this={bannerEl}
  class="game-result-banner {bannerClass}"
  data-player-color={playerColor}
  role="alertdialog"
  aria-modal="true"
  aria-label={outcomeText}
  tabindex="-1"
  onkeydown={trapFocus}
>
  <div class="result-content">
    <span class="outcome">{outcomeText}</span>
    <span class="reason">{reasonText}</span>
  </div>
  <div class="result-actions">
    <!-- TODO: Add "Review Game" button when game replay is implemented (Story 6.2) -->
    <button class="play-again-btn" onclick={() => onPlayAgain?.()}>
      {i18n.t('game.playAgain')}
    </button>
  </div>
</div>

<style>
  .game-result-banner {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    padding: 1rem 1.5rem;
    border-radius: 8px;
    animation: fadeIn 0.3s ease-in;
    text-align: center;
  }

  .game-result-banner.win {
    background: rgba(34, 197, 94, 0.15);
    border: 1px solid rgba(34, 197, 94, 0.5);
    color: #22c55e;
  }

  .game-result-banner.loss {
    background: var(--theme-bg-panel, #1a1a1a);
    border: 1px solid var(--theme-border, #333);
    color: var(--theme-text-primary, #eee);
  }

  .game-result-banner.draw {
    background: rgba(245, 158, 11, 0.15);
    border: 1px solid rgba(245, 158, 11, 0.5);
    color: #f59e0b;
  }

  .result-content {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .outcome {
    font-size: 1.25rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .reason {
    font-size: 0.75rem;
    font-weight: 500;
    opacity: 0.8;
  }

  .result-actions {
    display: flex;
    gap: 0.5rem;
  }

  .play-again-btn {
    padding: 0.5rem 1.25rem;
    border-radius: 6px;
    border: 1px solid var(--theme-primary, #06b6d4);
    background: var(--theme-primary, #06b6d4);
    color: #000;
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
    transition: opacity 0.15s;
  }

  .play-again-btn:hover {
    opacity: 0.9;
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }
</style>
