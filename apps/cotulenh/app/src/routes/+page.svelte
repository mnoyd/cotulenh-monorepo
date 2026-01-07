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
  import { logRender } from '$lib/debug';

  import '$lib/styles/modern-warfare.css';

  let boardComponent: BoardContainer | null = $state(null);
  let session = $state<GameSession | null>(null);

  // Log initial render
  logRender('🔄 [RENDER] +page.svelte initial render');

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
    logRender('🔄 [RENDER] +page.svelte $effect (setupBoardEffect) triggered');
    if (session) {
      session.setupBoardEffect();
    }
  });
</script>

<main
  class="min-h-screen flex justify-center items-center bg-black bg-center bg-fixed text-[#e5e5e5] font-ui max-lg:p-0 max-lg:items-start max-lg:h-screen max-lg:overflow-hidden"
  style="background-image: linear-gradient(rgba(0,0,0,0.7), rgba(0,0,0,0.8)), url('/assets/bg-warfare.jpg'); background-size: cover;"
>
  <div class="w-full max-w-[1600px] p-6 max-lg:p-0 max-lg:max-w-full max-lg:h-full">
    <div
      class="flex gap-6 items-stretch justify-center max-lg:flex-col max-lg:gap-0 max-lg:h-full max-lg:justify-start"
    >
      <!-- Board Section -->
      <div
        class="board-wrapper flex-none border border-mw-border p-1 bg-mw-bg-panel shadow-2xl rounded-sm w-[min(760px,100%)] max-lg:flex-1 max-lg:border-none max-lg:bg-black max-lg:shadow-none max-lg:p-0 max-lg:flex max-lg:items-center max-lg:justify-center max-lg:overflow-hidden"
      >
        {#if session}
          <BoardContainer
            bind:this={boardComponent}
            config={session.boardConfig}
            onApiReady={(api) => session?.setBoardApi(api)}
            class="w-full max-lg:h-auto max-lg:max-h-full max-lg:m-auto"
          />
        {:else}
          <div class="w-full aspect-[12/13] relative bg-[#111] flex items-center justify-center">
            <div class="loading-spinner"></div>
          </div>
        {/if}
      </div>

      <!-- Controls Section (Side Panel) -->
      <div
        class="w-[340px] flex flex-col gap-4 bg-mw-bg-panel border border-mw-border backdrop-blur-md rounded-sm p-4 max-lg:w-full max-lg:flex-none max-lg:bg-black/95 max-lg:border-t-2 max-lg:border-mw-secondary max-lg:p-3 max-lg:gap-3 max-lg:z-10"
      >
        <header class="border-b border-mw-border pb-3 mb-2 max-lg:hidden">
          <h1
            class="text-2xl m-0 font-extrabold tracking-wide text-white font-display uppercase flex items-center gap-2"
          >
            <span class="text-mw-secondary">Cotulenh</span>
            <span class="text-mw-primary font-light">Online</span>
          </h1>
        </header>

        <div class="flex flex-col gap-4 flex-1 max-lg:grid max-lg:grid-cols-2 max-lg:gap-2">
          <div class="max-lg:col-start-1">
            {#if session}
              <GameInfo {session} />
            {/if}
          </div>
          <div class="max-lg:col-span-full max-lg:order-3">
            {#if session}
              <DeploySessionPanel {session} />
            {/if}
          </div>
          <div class="max-lg:col-start-2">
            {#if session}
              <GameControls {session} />
            {/if}
          </div>
          <div
            class="flex-1 min-h-0 overflow-hidden max-lg:col-span-full max-lg:order-4 max-lg:h-[120px]"
          >
            {#if session}
              <MoveHistory {session} />
            {/if}
          </div>
        </div>
      </div>
    </div>
  </div>
</main>
