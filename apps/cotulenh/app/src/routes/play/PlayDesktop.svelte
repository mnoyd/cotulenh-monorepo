<script lang="ts">
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import { page } from '$app/stores';
  import BoardContainer from '$lib/components/BoardContainer.svelte';
  import GameInfo from '$lib/components/GameInfo.svelte';
  import MoveConfirmPanel from '$lib/components/MoveConfirmPanel.svelte';
  import MoveHistory from '$lib/components/MoveHistory.svelte';
  import GameControls from '$lib/components/GameControls.svelte';
  import ClockPanel from '$lib/components/ClockPanel.svelte';
  import ErrorBoundary from '$lib/components/ErrorBoundary.svelte';
  import { GameSession } from '$lib/game-session.svelte';
  import { createChessClock, TIME_PRESETS, type ClockColor } from '$lib/clock/clock.svelte';
  import { logger } from '@cotulenh/common';

  import '$lib/styles/board.css';

  let boardComponent: BoardContainer | null = $state(null);
  let session = $state<GameSession | null>(null);

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
</script>

<ErrorBoundary>
  <main class="game-page">
    <div class="game-container">
      <div class="game-layout">
        <!-- Board Section -->
        <div class="board-section">
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
        </div>

        <!-- Controls Section -->
        <div class="controls-section">
          <header class="controls-header">
            <h1>
              <span class="title-green">Cotulenh</span>
              <span class="title-cyan">Online</span>
            </h1>
          </header>

          <div class="controls-grid">
            <div class="controls-clock">
              <ClockPanel {clock} onTimeout={handleTimeout} />
            </div>
            <div class="controls-left">
              {#if session}
                <GameInfo {session} />
              {/if}
            </div>
            <div class="controls-right">
              {#if session}
                <GameControls {session} onReset={() => clock.reset()} />
              {/if}
            </div>
            <div class="controls-history">
              {#if session}
                <MoveHistory {session} />
              {/if}
            </div>
          </div>
        </div>
      </div>
    </div>
  </main>
</ErrorBoundary>

<style>
  .game-page {
    min-height: 100vh;
    display: flex;
    justify-content: center;
    align-items: center;
    background: var(--theme-bg-dark, #000);
    color: var(--theme-text-primary, #eee);
    font-family: var(--font-ui);
  }

  .game-container {
    width: 100%;
    max-width: 1600px;
    padding: 1.5rem;
  }

  .game-layout {
    display: flex;
    gap: 1.5rem;
    align-items: stretch;
    justify-content: center;
  }

  .board-section {
    flex: none;
    display: flex;
    flex-direction: column;
    border: 1px solid var(--theme-border, #444);
    padding: 0.25rem;
    background: var(--theme-bg-base, #222);
    width: min(760px, 100%);
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

  .controls-section {
    width: 340px;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    background: var(--theme-bg-panel, #222);
    border: 1px solid var(--theme-border, #444);
    padding: 1rem;
  }

  .controls-header {
    border-bottom: 1px solid var(--theme-border, #444);
    padding-bottom: 0.75rem;
    margin-bottom: 0.5rem;
  }

  .controls-header h1 {
    font-size: 1.5rem;
    margin: 0;
    font-weight: 800;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .title-green {
    color: #22c55e;
  }

  .title-cyan {
    color: #06b6d4;
    font-weight: 300;
  }

  .controls-grid {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    flex: 1;
  }

  .controls-clock {
    margin-bottom: 0.5rem;
  }
</style>
