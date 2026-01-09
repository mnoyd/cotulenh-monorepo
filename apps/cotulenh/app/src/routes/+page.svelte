<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import BoardContainer from '$lib/components/BoardContainer.svelte';
  import GameInfo from '$lib/components/GameInfo.svelte';
  import DeploySessionPanel from '$lib/components/DeploySessionPanel.svelte';
  import MoveHistory from '$lib/components/MoveHistory.svelte';
  import GameControls from '$lib/components/GameControls.svelte';
  import { GameSession } from '$lib/game-session.svelte';
  import { logger } from '@cotulenh/common';

  import '$lib/styles/board.css';

  let boardComponent: BoardContainer | null = $state(null);
  let session = $state<GameSession | null>(null);

  onMount(() => {
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

    session = new GameSession(initialFen);

    window.addEventListener('keydown', session.handleKeydown);

    return () => {
      if (session) {
        window.removeEventListener('keydown', session.handleKeydown);
      }
    };
  });

  $effect(() => {
    if (session) {
      session.setupBoardEffect();
    }
  });
</script>

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
          <div class="controls-left">
            {#if session}
              <GameInfo {session} />
            {/if}
          </div>
          <div class="controls-right">
            {#if session}
              <GameControls {session} />
            {/if}
          </div>
          <div class="controls-full">
            {#if session}
              <DeploySessionPanel {session} />
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

<style>
  /* Minimal static styles */
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
    /* NO animation */
  }

  .controls-section {
    width: 340px;
    display: flex;
    flex-direction: column;
    gap: 1rem;
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

  @media (max-width: 1024px) {
    .game-layout {
      flex-direction: column;
      gap: 0;
    }

    .board-section {
      border: none;
      background: var(--theme-bg-dark, #000);
      flex: 1;
      padding: 0;
    }

    .controls-section {
      width: 100%;
      flex: none;
      background: var(--theme-bg-dark, #000);
      border-top: 2px solid var(--theme-success, #22c55e);
      padding: 0.75rem;
      gap: 0.75rem;
    }

    .controls-header {
      display: none;
    }

    .controls-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.5rem;
    }

    .controls-left {
      grid-column: 1;
    }

    .controls-right {
      grid-column: 2;
    }

    .controls-full {
      grid-column: 1 / -1;
      order: 3;
    }

    .controls-history {
      grid-column: 1 / -1;
      order: 4;
      height: 120px;
      min-height: 0;
      overflow: hidden;
    }
  }
</style>
