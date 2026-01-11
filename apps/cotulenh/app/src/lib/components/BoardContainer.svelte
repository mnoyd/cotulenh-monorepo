<script lang="ts">
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import { logger } from '@cotulenh/common';
  import { logRender } from '$lib/debug';
  import { CotulenhBoard } from '@cotulenh/board';
  import type { Api, Config } from '@cotulenh/board';

  /**
   * BoardContainer - Centralized board presentation component
   *
   * CRITICAL: The board MUST maintain a 12/13 aspect ratio at all times.
   * This ratio cannot be violated as it breaks position calculations inside the board.
   * The board must never be covered or hidden.
   */

  type BoardContainerProps = {
    /** Board configuration passed to CotulenhBoard */
    config: Config;
    /** Callback when board API is ready */
    onApiReady?: (api: Api) => void;
    /** Callback when board is destroyed */
    onDestroy?: () => void;
    /** Additional CSS classes for the container */
    class?: string;
    /** Show loading indicator while board initializes */
    showLoading?: boolean;
  };

  let {
    config,
    onApiReady,
    onDestroy,
    class: className = '',
    showLoading = true
  }: BoardContainerProps = $props();

  let containerElement: HTMLElement | null = $state(null);
  let boardApi = $state<Api | null>(null);
  let isLoading = $state(true);

  // Log renders in effect to track reactive changes
  $effect(() => {
    logRender('🔄 [RENDER] BoardContainer.svelte component rendered', { config, isLoading });
  });

  /**
   * Ensure the board maintains proper dimensions after initialization
   * and during resize events. This is critical for position calculations.
   */
  function ensureBoardSize() {
    if (!containerElement) return;

    const cgContainer = containerElement.querySelector('cg-container') as HTMLElement;
    if (cgContainer) {
      const rect = containerElement.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        cgContainer.style.width = rect.width + 'px';
        cgContainer.style.height = rect.height + 'px';
      }
    }
  }

  /**
   * Update board configuration reactively
   */
  export function set(newConfig: Partial<Config>) {
    if (boardApi) {
      boardApi.set(newConfig);
    }
  }

  /**
   * Get the current board API instance
   */
  export function getApi(): Api | null {
    return boardApi;
  }

  /**
   * Force a redraw of the board
   */
  export function redraw() {
    if (boardApi) {
      boardApi.redrawAll();
      ensureBoardSize();
    }
  }

  onMount(() => {
    let resizeObserver: ResizeObserver | undefined;
    let cleanupFn: (() => void) | null = null;

    (async () => {
      if (!containerElement) return;

      // Load CSS before initializing board to prevent 0-size layout issues
      if (browser) {
        await Promise.all([
          import('@cotulenh/board/assets/commander-chess.base.css'),
          import('@cotulenh/board/assets/commander-chess.pieces.css')
        ]);
      }

      logger.debug('BoardContainer: Initializing board...');
      logRender('🔄 [RENDER] BoardContainer.svelte onMount - Initializing board');

      // Initialize the board
      boardApi = CotulenhBoard(containerElement, config);
      isLoading = false;

      // Notify parent that API is ready
      if (onApiReady) {
        onApiReady(boardApi);
      }

      // Ensure proper sizing after initialization
      // Multiple timeouts handle various browser rendering timings
      setTimeout(ensureBoardSize, 50);
      setTimeout(ensureBoardSize, 200);
      setTimeout(ensureBoardSize, 500);

      // Add resize observer for responsive sizing
      if (window.ResizeObserver) {
        resizeObserver = new ResizeObserver(() => {
          ensureBoardSize();
        });
        resizeObserver.observe(containerElement);
      }

      // Fallback resize handler
      const handleResize = () => ensureBoardSize();
      window.addEventListener('resize', handleResize);

      cleanupFn = () => {
        logger.debug('BoardContainer: Cleaning up...');
        window.removeEventListener('resize', handleResize);
        if (resizeObserver) {
          resizeObserver.disconnect();
        }
        boardApi?.destroy();
        if (onDestroy) {
          onDestroy();
        }
      };
    })();

    return () => {
      if (cleanupFn) cleanupFn();
    };
  });
</script>

<!--
  CRITICAL LAYOUT RULES:
  1. The board container MUST maintain aspect-ratio: 12/13
  2. The board MUST NOT be covered or hidden
  3. These constraints are required for correct position calculations
-->
<div
  bind:this={containerElement}
  class="board-container cg-wrap {className}"
  role="application"
  aria-label="Game board"
>
  {#if isLoading && showLoading}
    <div class="board-loading">
      <div class="loading-spinner"></div>
    </div>
  {/if}
</div>

<style>
  /*
   * CRITICAL: Board Container Styling
   *
   * The 12/13 aspect ratio MUST be maintained at all times.
   * This ratio is fundamental to the board's position calculation system.
   * DO NOT modify the aspect-ratio without understanding the implications.
   */
  .board-container {
    /* CRITICAL: Maintain 12:13 aspect ratio strictly */
    position: relative;
    aspect-ratio: 12 / 13;

    /* Fill available space while respecting aspect ratio */
    width: 100%;
    height: auto;
    max-width: 100%;
    max-height: 100%;

    /* Ensure content doesn't overflow */
    overflow: hidden;

    /* Base styling */
    background: #111;
    border-radius: 4px;
  }

  /*
   * When used inside a container with container-type: size,
   * use container query units to perfectly contain the board
   * while maximizing size and maintaining aspect ratio.
   */
  @container (min-width: 0px) {
    .board-container {
      width: min(100cqw, 100cqh * 12 / 13);
      height: min(100cqh, 100cqw * 13 / 12);
    }
  }

  /* Ensure internal board elements fill the container properly */
  .board-container :global(cg-container) {
    width: 100% !important;
    height: 100% !important;
  }

  .board-container :global(cg-board) {
    width: 100% !important;
    height: 100% !important;
  }

  /* Apply the board grid background image */
  .board-container :global(cg-background) {
    background-image: var(--theme-board-image);
    background-size: cover;
    background-position: center;
  }

  /* Loading state */
  .board-loading {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    color: var(--color-mw-secondary, #00ff41);
  }

  .loading-spinner {
    width: 40px;
    height: 40px;
    border: 3px solid rgba(255, 255, 255, 0.1);
    border-top-color: var(--color-mw-secondary, #00ff41);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
</style>
