<script lang="ts">
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import { page } from '$app/stores';
  import { RotateCcw, Undo2, ArrowUpDown, Share2, Flag, ChevronUp, ChevronDown } from 'lucide-svelte';
  import BoardContainer from '$lib/components/BoardContainer.svelte';
  import GameInfo from '$lib/components/GameInfo.svelte';
  import DeploySessionPanel from '$lib/components/DeploySessionPanel.svelte';
  import MoveHistory from '$lib/components/MoveHistory.svelte';
  import ClockPanel from '$lib/components/ClockPanel.svelte';
  import ShareDialog from '$lib/components/ShareDialog.svelte';
  import ErrorBoundary from '$lib/components/ErrorBoundary.svelte';
  import { GameSession } from '$lib/game-session.svelte';
  import { createChessClock, TIME_PRESETS, formatClockTime, type ClockColor } from '$lib/clock/clock.svelte';
  import { logger } from '@cotulenh/common';

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

  function handleTimeout(loser: ClockColor) {
    logger.info(`${loser === 'r' ? 'Red' : 'Blue'} lost on time`);
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

  function toggleBottomSheet() {
    bottomSheetExpanded = !bottomSheetExpanded;
  }

  function resetGame() {
    if (confirm('Reset the game?')) {
      session?.reset();
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
        <span class="clock-label">Blue</span>
        <span class="clock-time">{formatClockTime(clock.blueTime)}</span>
      </div>
      <div class="game-status">
        {#if session}
          {#if session.status === 'playing'}
            <span class="turn-indicator {session.turn === 'r' ? 'red' : 'blue'}">
              {session.turn === 'r' ? 'Red' : 'Blue'}'s turn
            </span>
          {:else if session.status === 'checkmate'}
            <span class="status-end">Checkmate!</span>
          {:else if session.status === 'stalemate'}
            <span class="status-end">Stalemate</span>
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
      {:else}
        <div class="board-placeholder">
          <div class="loading-spinner"></div>
        </div>
      {/if}
    </section>

    <!-- Bottom Bar: Clock for player + Quick Actions -->
    <div class="bottom-bar">
      <div class="clock-mini red">
        <span class="clock-label">Red</span>
        <span class="clock-time">{formatClockTime(clock.redTime)}</span>
      </div>

      <div class="quick-actions">
        <button 
          class="action-btn" 
          onclick={undoLastMove} 
          title="Undo last move" 
          aria-label="Undo last move"
          disabled={!session?.canUndo}
        >
          <Undo2 size={20} />
        </button>
        <button 
          class="action-btn" 
          onclick={flipBoard} 
          title="Flip board" 
          aria-label="Flip board"
        >
          <ArrowUpDown size={20} />
        </button>
        <button 
          class="action-btn" 
          onclick={resetGame} 
          title="Reset game" 
          aria-label="Reset game"
        >
          <RotateCcw size={20} />
        </button>
        <button 
          class="action-btn" 
          onclick={() => (shareOpen = true)} 
          title="Share game" 
          aria-label="Share game"
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
      aria-label="Game information panel"
    >
      <button 
        class="sheet-handle" 
        onclick={toggleBottomSheet}
        aria-label={bottomSheetExpanded ? 'Collapse game info' : 'Expand game info'}
      >
        <div class="handle-bar"></div>
        {#if bottomSheetExpanded}
          <ChevronDown size={16} />
        {:else}
          <ChevronUp size={16} />
        {/if}
        <span class="handle-label">Game Info</span>
      </button>

      {#if bottomSheetExpanded}
        <div class="sheet-content">
          {#if session}
            <div class="info-section">
              <GameInfo {session} />
            </div>

            <div class="deploy-section">
              <DeploySessionPanel {session} />
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
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
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
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
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
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }

  .sheet-content {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding: 0 0.75rem 0.75rem;
    max-height: calc(50vh - 50px);
    overflow-y: auto;
  }

  .info-section,
  .deploy-section {
    flex-shrink: 0;
  }

  .history-section {
    flex: 1;
    min-height: 100px;
    max-height: 150px;
    overflow: hidden;
  }
</style>
