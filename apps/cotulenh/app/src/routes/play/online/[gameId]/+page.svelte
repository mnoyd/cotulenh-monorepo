<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { toast } from 'svelte-sonner';
  import BoardContainer from '$lib/components/BoardContainer.svelte';
  import OnlineIndicator from '$lib/components/OnlineIndicator.svelte';
  import ReconnectBanner from '$lib/components/ReconnectBanner.svelte';
  import { OnlineGameSession } from '$lib/game/online-session.svelte';
  import { setStoredValue } from '$lib/stores/persisted.svelte';
  import { formatClockTime } from '$lib/clock/clock.svelte';
  import { getI18n } from '$lib/i18n/index.svelte';
  import type { Api } from '@cotulenh/board';
  import type { PageData } from './$types';

  import '$lib/styles/board.css';

  const i18n = getI18n();

  let { data }: { data: PageData } = $props();

  let onlineSession = $state<OnlineGameSession | null>(null);
  let boardComponent: BoardContainer | null = $state(null);

  const orientation = data.playerColor === 'red' ? 'red' : 'blue';

  // Clock display: opponent clock at top, player clock at bottom
  let opponentTime = $derived(
    onlineSession
      ? onlineSession.playerColor === 'red'
        ? onlineSession.blueTime
        : onlineSession.redTime
      : data.game.timeControl.timeMinutes * 60 * 1000
  );

  let playerTime = $derived(
    onlineSession
      ? onlineSession.playerColor === 'red'
        ? onlineSession.redTime
        : onlineSession.blueTime
      : data.game.timeControl.timeMinutes * 60 * 1000
  );

  let isMyTurn = $derived(
    onlineSession &&
      onlineSession.lifecycle === 'playing'
      ? (onlineSession.turn === 'r' && data.playerColor === 'red') ||
        (onlineSession.turn === 'b' && data.playerColor === 'blue')
      : false
  );

  let showDisconnectBanner = $derived(
    onlineSession !== null &&
    !onlineSession.opponentConnected &&
    onlineSession.lifecycle === 'playing'
  );

  let moveCount = $derived(onlineSession ? onlineSession.history.length : 0);

  let turnLabel = $derived(
    isMyTurn ? i18n.t('game.yourTurn') : i18n.t('game.opponentTurn')
  );

  let statusLabel = $derived.by(() => {
    if (!onlineSession) return i18n.t('game.connecting');
    if (onlineSession.connectionState === 'connecting') return i18n.t('game.connecting');
    if (onlineSession.connectionState === 'disconnected') return i18n.t('game.connectionLost');
    if (onlineSession.lifecycle === 'waiting') return i18n.t('game.waitingForOpponent');
    if (onlineSession.lifecycle === 'ended') return '';
    return turnLabel;
  });

  let opponentClockActive = $derived(
    onlineSession?.activeSide === onlineSession?.opponentClockColor
  );

  let playerClockActive = $derived(
    onlineSession?.activeSide === onlineSession?.myClockColor
  );

  onMount(() => {
    const supabase = $page.data.supabase;

    const session = new OnlineGameSession(
      {
        gameId: data.game.id,
        playerColor: data.playerColor as 'red' | 'blue',
        currentUserId: data.currentUserId,
        opponentUserId: data.opponent.id,
        timeControl: data.game.timeControl,
        supabase
      },
      () => {
        // onAbort callback
        toast.info(i18n.t('game.gameAborted'));
        goto('/play/online');
      },
      (errorContext) => {
        // onSyncError callback
        toast.error(i18n.t('game.syncFailed'), {
          action: {
            label: i18n.t('game.syncFailedReport'),
            onClick: () => {
              setStoredValue('report_pgn', errorContext.pgn);
              setStoredValue('report_description',
                `Game sync failed\nGame ID: ${errorContext.gameId}\nFEN: ${errorContext.fen}\nError: ${String(errorContext.error)}`
              );
              goto('/report-issue');
            }
          }
        });
      }
    );

    onlineSession = session;
    session.join();

    return () => {
      session.destroy();
    };
  });

  function handleBoardReady(api: Api) {
    if (onlineSession) {
      onlineSession.session.setBoardApi(api);
    }
  }

  $effect(() => {
    if (onlineSession) {
      onlineSession.session.setupBoardEffect();
    }
  });
</script>

<svelte:head>
  <title>{i18n.t('game.pageTitle')} | {i18n.t('nav.appName')}</title>
</svelte:head>

<div class="game-page">
  <div class="game-layout">
    <!-- Opponent info + clock (top) -->
    <div class="player-bar opponent">
      <div class="player-info">
        <OnlineIndicator online={onlineSession?.opponentConnected ?? false} />
        <span class="player-name">{data.opponent.displayName}</span>
      </div>
      <div class="clock" class:active={opponentClockActive}>
        {formatClockTime(opponentTime)}
      </div>
    </div>

    <!-- Board -->
    <div class="board-area">
      {#if onlineSession}
        <BoardContainer
          bind:this={boardComponent}
          config={{
            ...onlineSession.session.boardConfig,
            orientation,
            viewOnly:
              onlineSession.lifecycle !== 'playing' ||
              onlineSession.connectionState !== 'connected' ||
              !isMyTurn
          }}
          onApiReady={handleBoardReady}
        />
      {:else}
        <div class="board-loading-placeholder">
          <p>{i18n.t('game.connecting')}</p>
        </div>
      {/if}
    </div>

    <!-- Reconnect banner -->
    <ReconnectBanner visible={showDisconnectBanner} />

    <!-- Game status bar -->
    <div class="status-bar">
      {#if onlineSession?.lifecycle === 'playing'}
        <span class="turn-indicator" class:my-turn={isMyTurn}>
          {statusLabel}
        </span>
        <span class="move-counter">
          {i18n.t('game.moveCount').replace('{count}', String(moveCount))}
        </span>
      {:else}
        <span class="status-text">{statusLabel}</span>
      {/if}
    </div>

    <!-- Player info + clock (bottom) -->
    <div class="player-bar self">
      <div class="player-info">
        <span class="color-dot {data.playerColor}"></span>
        <span class="player-name you">{i18n.t('common.play')}</span>
      </div>
      <div class="clock" class:active={playerClockActive}>
        {formatClockTime(playerTime)}
      </div>
    </div>
  </div>
</div>

<style>
  .game-page {
    display: flex;
    justify-content: center;
    align-items: flex-start;
    padding: 0.5rem;
    min-height: 100vh;
  }

  .game-layout {
    width: 100%;
    max-width: 560px;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .player-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem 0.75rem;
    background: var(--theme-bg-panel, #1a1a1a);
    border: 1px solid var(--theme-border, #333);
    border-radius: 6px;
  }

  .player-info {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .player-name {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--theme-text-primary, #eee);
  }

  .player-name.you {
    color: var(--theme-text-secondary, #aaa);
  }

  .color-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .color-dot.red {
    background: #ef4444;
  }

  .color-dot.blue {
    background: #3b82f6;
  }

  .clock {
    font-family: var(--font-mono, monospace);
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--theme-text-secondary, #888);
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    min-width: 5ch;
    text-align: center;
  }

  .clock.active {
    color: var(--theme-text-primary, #fff);
    background: var(--theme-bg-active, rgba(6, 182, 212, 0.15));
    border: 1px solid var(--theme-primary, #06b6d4);
  }

  .board-area {
    container-type: size;
    width: 100%;
    aspect-ratio: 12 / 13;
    position: relative;
  }

  .board-loading-placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    background: var(--theme-bg-panel, #1a1a1a);
    border-radius: 4px;
    color: var(--theme-text-secondary, #aaa);
    font-size: 0.875rem;
  }

  .status-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.375rem 0.75rem;
    background: var(--theme-bg-panel, #1a1a1a);
    border: 1px solid var(--theme-border, #333);
    border-radius: 6px;
    min-height: 2rem;
  }

  .turn-indicator {
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--theme-text-secondary, #aaa);
  }

  .turn-indicator.my-turn {
    color: var(--theme-primary, #06b6d4);
  }

  .move-counter {
    font-size: 0.75rem;
    color: var(--theme-text-secondary, #888);
    font-family: var(--font-mono, monospace);
  }

  .status-text {
    font-size: 0.75rem;
    font-weight: 500;
    color: var(--theme-text-secondary, #aaa);
  }

  @media (min-width: 768px) {
    .game-page {
      align-items: center;
      padding: 1rem;
    }

    .clock {
      font-size: 1.5rem;
    }
  }
</style>
