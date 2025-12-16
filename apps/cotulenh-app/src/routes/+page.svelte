<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { CotulenhBoard } from '@repo/cotulenh-board';
  import type { Api, DestMove, OrigMove } from '@repo/cotulenh-board';
  import { CoTuLenh } from '@repo/cotulenh-core';
  import SidePanel from '$lib/components/SidePanel.svelte';
  import { gameStore } from '$lib/stores/game';
  import { makeMove, commitDeploySession, cancelDeploySession } from '$lib/game-actions';
  import { createBoardConfig, getAirDefenseZones } from '$lib/board-sync';

  import '@repo/cotulenh-board/assets/commander-chess.base.css';
  import '@repo/cotulenh-board/assets/commander-chess.pieces.css';
  import '$lib/styles/modern-warfare.css';

  let boardContainerElement: HTMLElement | null = null;
  let boardApi = $state<Api | null>(null);
  let game = $state<CoTuLenh | null>(null);

  // ============================================================================
  // BOARD SYNCHRONIZATION
  // ============================================================================

  function syncBoardWithGameState() {
    if (!boardApi || !game) return;

    const config = createBoardConfig($gameStore, {
      onMove: handleMove,
      onCommit: handleCommitDeploy,
      onCancel: handleCancelDeploy
    });

    boardApi.set({
      ...config,
      airDefense: { influenceZone: getAirDefenseZones(game) }
    });
  }

  // ============================================================================
  // MOVE HANDLERS
  // ============================================================================

  function handleMove(orig: OrigMove, dest: DestMove) {
    if (!game) return;

    try {
      const moveResult = makeMove(game, orig, dest);
      
      if (moveResult) {
        gameStore.afterMove(game, moveResult);
      } else {
        console.warn('Illegal move attempted:', orig, '->', dest);
      }
    } catch (error) {
      console.error('Error making move:', error);
      syncBoardWithGameState();
    }
  }

  function handleCommitDeploy() {
    if (!game) return;

    try {
      const result = commitDeploySession(game);

      if (!result.success) {
        alert(`Cannot finish deployment: ${result.reason}`);
        return;
      }

      gameStore.afterDeployCommit(game, result.san!);
    } catch (error) {
      console.error('Failed to commit deploy:', error);
      alert(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  function handleCancelDeploy() {
    if (!game) return;

    try {
      cancelDeploySession(game);
      gameStore.initialize(game);
    } catch (error) {
      console.error('Failed to cancel deploy:', error);
      alert(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ============================================================================
  // LIFECYCLE
  // ============================================================================

  onMount(() => {
    if (!boardContainerElement) return;

    // Load FEN from URL if provided
    const urlFen = $page.url.searchParams.get('fen');
    const initialFen = urlFen ? decodeURIComponent(urlFen) : undefined;

    // Initialize game
    game = initialFen ? new CoTuLenh(initialFen) : new CoTuLenh();
    gameStore.initialize(game);

    // Initialize board
    const config = createBoardConfig($gameStore, {
      onMove: handleMove,
      onCommit: handleCommitDeploy,
      onCancel: handleCancelDeploy
    });

    boardApi = CotulenhBoard(boardContainerElement, {
      ...config,
      airDefense: { influenceZone: getAirDefenseZones(game) }
    });

    return () => {
      boardApi?.destroy();
    };
  });

  // ============================================================================
  // REACTIVITY
  // ============================================================================

  let lastProcessedFen = '';

  $effect(() => {
    if (boardApi && $gameStore.fen && $gameStore.fen !== lastProcessedFen) {
      lastProcessedFen = $gameStore.fen;
      syncBoardWithGameState();
    }
  });
</script>

<main>
  <div class="layout-container">
    <div class="page-header">
      <div class="header-content">
        <h1>Strategic Command</h1>
        <p class="subtitle">Master the art of tactical warfare in CoTuLenh</p>
      </div>
    </div>

    <div class="game-layout">
      <div class="board-section">
        <div bind:this={boardContainerElement} class="board-container">
          {#if !boardApi}
            <div class="loading-state">
              <div class="loading-spinner"></div>
              <p>Initializing battlefield...</p>
            </div>
          {/if}
        </div>
      </div>

      <div class="controls-section">
        <SidePanel {game} onCommit={handleCommitDeploy} onCancel={handleCancelDeploy} />
      </div>
    </div>
  </div>
</main>

<style>
  main {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 100vh;
    background-color: var(--mw-bg-dark);
    font-family: var(--font-ui);
    color: #e0e0e0;
  }

  .layout-container {
    max-width: 1800px;
    margin: 0 auto;
    padding: var(--spacing-xl);
    width: 100%;
    position: relative;
    z-index: 1;
  }

  .layout-container::before {
    content: '';
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background:
      linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%),
      linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06));
    background-size:
      100% 2px,
      3px 100%;
    pointer-events: none;
    z-index: 999;
    opacity: 0.6;
  }

  .page-header {
    margin-bottom: var(--spacing-xl);
    text-align: center;
    position: relative;
    border-bottom: 1px solid var(--mw-border-color);
    padding-bottom: var(--spacing-lg);
  }

  .header-content {
    display: inline-block;
    position: relative;
  }

  h1 {
    font-family: var(--font-display);
    font-size: clamp(2.5rem, 5vw, 5rem);
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin-bottom: var(--spacing-xs);
    color: var(--mw-primary);
    text-shadow: var(--mw-text-glow);
    position: relative;
    display: inline-block;
  }

  h1::after {
    content: 'STRATEGIC COMMAND';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    opacity: 0.5;
    filter: blur(5px);
    z-index: -1;
  }

  .subtitle {
    font-family: var(--font-mono);
    font-size: 1rem;
    color: var(--mw-secondary);
    text-transform: uppercase;
    letter-spacing: 0.2em;
    margin: 0;
    margin-top: var(--spacing-sm);
    opacity: 0.8;
  }

  .game-layout {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 450px;
    gap: var(--spacing-xl);
    align-items: start;
  }

  .board-section {
    display: flex;
    justify-content: center;
    align-items: flex-start;
    padding: var(--spacing-md);
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid var(--mw-border-color);
    border-radius: 4px;
    backdrop-filter: blur(5px);
  }

  .board-container {
    width: 100%;
    max-width: 900px;
    aspect-ratio: 12 / 13;
    position: relative;
    display: flex;
    justify-content: center;
    align-items: center;
    box-shadow: 0 0 50px rgba(0, 0, 0, 0.5);
    border-radius: 2px;
    border: 1px solid var(--mw-primary-dim);
    overflow: hidden;
  }

  .board-section::before,
  .board-section::after {
    content: '';
    position: absolute;
    width: 20px;
    height: 20px;
    border: 2px solid var(--mw-primary);
    transition: all 0.3s ease;
  }
  .board-section::before {
    top: -2px;
    left: -2px;
    border-right: 0;
    border-bottom: 0;
  }
  .board-section::after {
    bottom: -2px;
    right: -2px;
    border-left: 0;
    border-top: 0;
  }

  .loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-md);
    color: var(--mw-primary);
    font-family: var(--font-mono);
  }

  .loading-spinner {
    width: 64px;
    height: 64px;
    border: 2px solid transparent;
    border-top-color: var(--mw-primary);
    border-right-color: var(--mw-secondary);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    box-shadow: 0 0 15px var(--mw-primary-dim);
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .controls-section {
    position: sticky;
    top: 20px;
    height: calc(100vh - 40px);
  }

  @media (max-width: 1400px) {
    .game-layout {
      grid-template-columns: minmax(0, 1fr) 400px;
    }
  }

  @media (max-width: 1024px) {
    .game-layout {
      grid-template-columns: 1fr;
      gap: var(--spacing-xl);
    }

    .board-container {
      max-width: 100%;
    }

    .controls-section {
      position: static;
      max-height: none;
      padding-right: 0;
    }
  }

  @media (max-width: 768px) {
    .layout-container {
      padding: var(--spacing-sm);
    }
    h1 {
      font-size: 2.5rem;
    }

    .board-section {
      padding: 0;
      border: none;
      background: transparent;
    }
  }
</style>
