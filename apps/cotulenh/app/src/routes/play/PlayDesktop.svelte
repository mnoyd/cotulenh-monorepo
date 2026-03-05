<script lang="ts">
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import { page } from '$app/stores';
  import BoardContainer from '$lib/components/BoardContainer.svelte';
  import MoveConfirmPanel from '$lib/components/MoveConfirmPanel.svelte';
  import MoveHistory from '$lib/components/MoveHistory.svelte';
  import ClockPanel from '$lib/components/ClockPanel.svelte';
  import ErrorBoundary from '$lib/components/ErrorBoundary.svelte';
  import CommandCenter from '$lib/components/CommandCenter.svelte';
  import ShareDialog from '$lib/components/ShareDialog.svelte';
  import { GameSession } from '$lib/game-session.svelte';
  import { createChessClock, TIME_PRESETS, type ClockColor } from '$lib/clock/clock.svelte';
  import { logger } from '@cotulenh/common';
  import { getI18n } from '$lib/i18n/index.svelte';
  import { setStoredValue } from '$lib/stores/persisted.svelte';
  import { goto } from '$app/navigation';
  import '$lib/styles/board.css';
  import '$lib/styles/command-center.css';

  const i18n = getI18n();

  let boardComponent: BoardContainer | null = $state(null);
  let session = $state<GameSession | null>(null);
  let shareOpen = $state(false);

  const clock = createChessClock({
    red: TIME_PRESETS.blitz5_3,
    blue: TIME_PRESETS.blitz5_3
  });

  function handleTimeout(loser: ClockColor) {
    logger.info(`${loser === 'r' ? 'Red' : 'Blue'} lost on time`);
  }

  function resetGame() {
    if (confirm(i18n.t('game.resetConfirm'))) {
      session?.reset();
      clock.reset();
    }
  }

  function undoLastMove() {
    session?.undo();
  }

  function flipBoard() {
    session?.flipBoard();
  }

  function reportIssue() {
    if (session) {
      setStoredValue('report_pgn', session.pgn);
    }
    goto('/report-issue');
  }

  onMount(() => {
    if (!browser) return;

    const urlFen = $page.url.searchParams.get('fen');
    let initialFen: string | undefined;

    if (urlFen) {
      try {
        initialFen = decodeURIComponent(urlFen);
        logger.debug('Loading game with custom FEN:', { fen: initialFen });
      } catch (error) {
        logger.error(error, 'Error decoding FEN from URL:');
      }
    }

    try {
      session = new GameSession(initialFen);

      session.onMove = () => {
        if (clock.status === 'idle') {
          clock.start('r');
        }
        clock.switchSide();
      };
    } catch (error) {
      logger.error(error, 'Failed to initialize game session:');
      throw error;
    }

    window.addEventListener('keydown', session.handleKeydown);

    return () => {
      if (session) {
        window.removeEventListener('keydown', session.handleKeydown);
      }
      clock.destroy();
    };
  });

  $effect(() => {
    if (session) {
      session.setupBoardEffect();
    }
  });

  $effect(() => {
    if (session && session.status !== 'playing') {
      clock.stop();
    }
  });

  let tabs = $derived([
    { id: 'moves', label: i18n.t('tabs.moves'), content: movesTab },
    { id: 'game', label: i18n.t('tabs.game'), content: gameTab }
  ]);
</script>

<ErrorBoundary>
  <CommandCenter center={centerContent} {tabs} />
</ErrorBoundary>

{#snippet centerContent()}
  <div class="board-area">
    <div class="board-sizer">
      {#if session}
        <BoardContainer
          bind:this={boardComponent}
          config={session.boardConfig}
          onApiReady={(api) => session?.setBoardApi(api)}
        />
      {:else}
        <div class="board-placeholder">
          <span class="text-secondary">Loading...</span>
        </div>
      {/if}
    </div>
    {#if session}
      <MoveConfirmPanel {session} />
    {/if}
  </div>
{/snippet}

{#snippet movesTab()}
  {#if session}
    <MoveHistory {session} />
  {:else}
    <p class="text-secondary">No moves yet</p>
  {/if}
{/snippet}

{#snippet gameTab()}
  <div class="game-tab">
    <ClockPanel {clock} onTimeout={handleTimeout} />

    <hr class="divider" />

    {#if session}
      <div class="game-status">
        <span class="section-header">Turn</span>
        <span class="status-value">{session.turn === 'r' ? i18n.t('common.red') : i18n.t('common.blue')}</span>
      </div>
      <div class="game-status">
        <span class="section-header">Status</span>
        <span class="status-value">{session.status}</span>
      </div>

      <hr class="divider" />

      <div class="game-actions">
        <button class="text-link" onclick={resetGame}>{i18n.t('common.reset')}</button>
        <button class="text-link" onclick={undoLastMove}>{i18n.t('common.undo')}</button>
        <button class="text-link" onclick={flipBoard}>{i18n.t('common.flip')}</button>
        <button class="text-link" onclick={() => (shareOpen = true)}>{i18n.t('common.share')}</button>
        <button class="text-link" onclick={reportIssue}>{i18n.t('common.report')}</button>
      </div>
    {/if}
  </div>

  <ShareDialog bind:open={shareOpen} fen={session?.fen ?? ''} />
{/snippet}

<style>
  .board-area {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    flex: 1;
    min-height: 0;
  }

  .board-sizer {
    flex: 1;
    min-height: 0;
    width: 100%;
    container-type: size;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .board-placeholder {
    width: 100%;
    aspect-ratio: 12 / 13;
    background: var(--theme-bg-dark, #111);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .text-secondary {
    color: var(--theme-text-secondary, #aaa);
    font-size: 0.8125rem;
  }

  .game-tab {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .game-status {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.125rem 0;
  }

  .status-value {
    font-family: var(--font-mono);
    font-size: 0.8125rem;
    color: var(--theme-text-primary, #eee);
    text-transform: capitalize;
  }

  .game-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
  }
</style>
