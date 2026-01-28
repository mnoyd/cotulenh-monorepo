<script lang="ts">
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import { page } from '$app/stores';
  import { RotateCcw, Undo2, ArrowUpDown, Share2, ChevronUp, ChevronDown } from 'lucide-svelte';
  import BoardContainer from '$lib/components/BoardContainer.svelte';
  import GameInfo from '$lib/components/GameInfo.svelte';
  import MoveConfirmPanel from '$lib/components/MoveConfirmPanel.svelte';
  import MoveHistory from '$lib/components/MoveHistory.svelte';
  import ShareDialog from '$lib/components/ShareDialog.svelte';
  import ErrorBoundary from '$lib/components/ErrorBoundary.svelte';
  import { GameSession } from '$lib/game-session.svelte';
  import { createChessClock, TIME_PRESETS, formatClockTime } from '$lib/clock/clock.svelte';
  import { logger } from '@cotulenh/common';
  import { getI18n } from '$lib/i18n/index.svelte';

  const i18n = getI18n();

  // Reactive translations for aria-labels
  let tUndoMove = $derived.by(() => i18n.t('a11y.undoMove'));
  let tFlipBoard = $derived.by(() => i18n.t('a11y.flipBoard'));
  let tResetGame = $derived.by(() => i18n.t('a11y.resetGame'));
  let tShareGame = $derived.by(() => i18n.t('a11y.shareGame'));
  let tGameInfoPanel = $derived.by(() => i18n.t('a11y.gameInfoPanel'));
  let tCollapseGameInfo = $derived.by(() => i18n.t('a11y.collapseGameInfo'));
  let tExpandGameInfo = $derived.by(() => i18n.t('a11y.expandGameInfo'));

  import '$lib/styles/board.css';

  let boardComponent: BoardContainer | null = $state(null);
  let session = $state<GameSession | null>(null);
  let bottomSheetExpanded = $state(false);
  let shareOpen = $state(false);

  $effect(() => {
    if (bottomSheetExpanded) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  });

  const clock = createChessClock({
    red: TIME_PRESETS.blitz5_3,
    blue: TIME_PRESETS.blitz5_3
  });


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

  function toggleBottomSheet() {
    bottomSheetExpanded = !bottomSheetExpanded;
  }

  function resetGame() {
    if (confirm(i18n.t('game.simpleResetConfirm'))) {
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
</script>

<ErrorBoundary>
  <main class="game-mobile">
    <!-- Top Bar: Clock for opponent -->
    <header class="top-bar">
      <div class="clock-mini blue">
        <span class="clock-label">{i18n.t('common.blue')}</span>
        <span class="clock-time">{formatClockTime(clock.blueTime)}</span>
      </div>
      <div class="game-status">
        {#if session}
          {#if session.status === 'playing'}
            <span class="turn-indicator {session.turn === 'r' ? 'red' : 'blue'}">
              {i18n.t('game.redTurn').replace('{color}', session.turn === 'r' ? i18n.t('common.red') : i18n.t('common.blue'))}
            </span>
          {:else if session.status === 'checkmate'}
            <span class="status-end">{i18n.t('game.checkmate')}</span>
          {:else if session.status === 'stalemate'}
            <span class="status-end">{i18n.t('game.stalemate')}</span>
          {/if}
        {/if}
      </div>
    </header>

    <!-- Board Section -->
    <section class="board-section">
      {#if session}
        <BoardContainer
          bind:this={boardComponent}
          config={session.boardConfig}
          onApiReady={(api) => session?.setBoardApi(api)}
        />
        <!-- Move confirmation panel directly under the board -->
        <MoveConfirmPanel {session} />
      {:else}
        <div class="board-placeholder">
          <div class="loading-spinner"></div>
        </div>
      {/if}
    </section>

    <!-- Bottom Bar: Clock for player + Quick Actions -->
    <div class="bottom-bar">
      <div class="clock-mini red">
        <span class="clock-label">{i18n.t('common.red')}</span>
        <span class="clock-time">{formatClockTime(clock.redTime)}</span>
      </div>

      <div class="quick-actions">
        <button
          class="action-btn"
          onclick={undoLastMove}
          title={tUndoMove}
          aria-label={tUndoMove}
          disabled={!session?.canUndo}
        >
          <Undo2 size={20} />
        </button>
        <button
          class="action-btn"
          onclick={flipBoard}
          title={tFlipBoard}
          aria-label={tFlipBoard}
        >
          <ArrowUpDown size={20} />
        </button>
        <button
          class="action-btn"
          onclick={resetGame}
          title={tResetGame}
          aria-label={tResetGame}
        >
          <RotateCcw size={20} />
        </button>
        <button
          class="action-btn"
          onclick={() => (shareOpen = true)}
          title={tShareGame}
          aria-label={tShareGame}
        >
          <Share2 size={20} />
        </button>
      </div>
    </div>

    <!-- Bottom Sheet -->
    <div
      class="bottom-sheet"
      class:expanded={bottomSheetExpanded}
      role="region"
      aria-label={tGameInfoPanel}
    >
      <button
        class="sheet-handle"
        onclick={toggleBottomSheet}
        aria-label={bottomSheetExpanded ? tCollapseGameInfo : tExpandGameInfo}
      >
        <div class="handle-bar"></div>
        {#if bottomSheetExpanded}
          <ChevronDown size={16} />
        {:else}
          <ChevronUp size={16} />
        {/if}
        <span class="handle-label">{i18n.t('game.gameInfo')}</span>
      </button>

      {#if bottomSheetExpanded}
        <div class="sheet-content">
          {#if session}
            <div class="info-section">
              <GameInfo {session} />
            </div>

            <div class="history-section">
              <MoveHistory {session} />
            </div>
          {/if}
        </div>
      {/if}
    </div>
  </main>
</ErrorBoundary>

{#if session}
  <ShareDialog bind:open={shareOpen} fen={session.fen} />
{/if}

<style>
  .game-mobile {
    height: 100dvh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: var(--theme-bg-dark, #000);
    color: var(--theme-text-primary, #eee);
  }

  /* Top Bar */
  .top-bar {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.5rem 0.75rem;
    padding-left: 60px; /* Space for mobile menu button */
    background: var(--theme-bg-panel, #111);
    border-bottom: 1px solid var(--theme-border, #333);
  }

  .clock-mini {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 0.25rem 0.75rem;
    border-radius: 6px;
    min-width: 70px;
  }

  .clock-mini.red {
    background: rgba(239, 68, 68, 0.15);
    border: 1px solid rgba(239, 68, 68, 0.4);
  }

  .clock-mini.blue {
    background: rgba(59, 130, 246, 0.15);
    border: 1px solid rgba(59, 130, 246, 0.4);
  }

  .clock-label {
    font-size: 0.6rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    opacity: 0.7;
  }

  .clock-time {
    font-family: var(--font-mono, monospace);
    font-size: 1rem;
    font-weight: 700;
  }

  .clock-mini.red .clock-time {
    color: #ef4444;
  }

  .clock-mini.blue .clock-time {
    color: #3b82f6;
  }

  .game-status {
    text-align: center;
  }

  .turn-indicator {
    font-size: 0.7rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    white-space: nowrap;
  }

  .turn-indicator.red {
    color: #ef4444;
    background: rgba(239, 68, 68, 0.1);
  }

  .turn-indicator.blue {
    color: #3b82f6;
    background: rgba(59, 130, 246, 0.1);
  }

  .status-end {
    font-size: 0.8rem;
    font-weight: 700;
    color: #fbbf24;
  }

  /* Board Section */
  .board-section {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: #000;
    container-type: size;
    padding: 0.25rem;
  }

  .board-section :global(.cg-wrap) {
    width: min(100cqw, 100cqh * 12 / 13);
    height: min(100cqh, 100cqw * 13 / 12);
  }

  .board-placeholder {
    width: 100%;
    aspect-ratio: 12 / 13;
    background: #111;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .loading-spinner {
    width: 40px;
    height: 40px;
    border: 3px solid #333;
    border-top-color: #22c55e;
    border-radius: 50%;
  }

  /* Bottom Bar */
  .bottom-bar {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.5rem 0.75rem;
    background: var(--theme-bg-panel, #111);
    border-top: 1px solid var(--theme-border, #333);
  }

  .quick-actions {
    display: flex;
    gap: 0.5rem;
  }

  .action-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 8px;
    color: #aaa;
    cursor: pointer;
    transition: all 0.2s;
  }

  .action-btn:hover,
  .action-btn:active {
    background: rgba(255, 255, 255, 0.1);
    color: #fff;
  }

  .action-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  /* Bottom Sheet */
  .bottom-sheet {
    flex-shrink: 0;
    background: var(--theme-bg-panel, #111);
    border-top: 2px solid #22c55e;
    max-height: 44px;
    overflow: hidden;
    transition: max-height 0.3s ease;
  }

  .bottom-sheet.expanded {
    max-height: 50vh;
  }

  .sheet-handle {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.5rem;
    background: transparent;
    border: none;
    color: #888;
    cursor: pointer;
  }

  .handle-bar {
    width: 40px;
    height: 4px;
    background: #444;
    border-radius: 2px;
  }

  .handle-label {
    font-size: 0.65rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    white-space: nowrap;
  }

  .sheet-content {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding: 0 0.75rem 0.75rem;
    max-height: calc(50vh - 50px);
    overflow-y: auto;
  }

  .info-section {
    flex-shrink: 0;
  }

  .history-section {
    flex: 1;
    min-height: 100px;
    max-height: 150px;
    overflow: hidden;
  }
</style>
