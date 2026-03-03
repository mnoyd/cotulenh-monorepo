<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { toast } from 'svelte-sonner';
  import BoardContainer from '$lib/components/BoardContainer.svelte';
  import OnlineIndicator from '$lib/components/OnlineIndicator.svelte';
  import ReconnectBanner from '$lib/components/ReconnectBanner.svelte';
  import GameResultBanner from '$lib/components/GameResultBanner.svelte';
  import * as Dialog from '$lib/components/ui/dialog';
  import { OnlineGameSession } from '$lib/game/online-session.svelte';
  import type { GameEndResult } from '$lib/game/online-session-core';
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
  let gameResult = $state<GameEndResult | null>(null);
  let resignDialogOpen = $state(false);

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

  let opponentFlagged = $derived(onlineSession?.opponentFlagged ?? false);

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

    const playerColor = data.playerColor as 'red' | 'blue';
    const redPlayerName = playerColor === 'red' ? data.currentDisplayName : data.opponent.displayName;
    const bluePlayerName = playerColor === 'blue' ? data.currentDisplayName : data.opponent.displayName;

    const session = new OnlineGameSession(
      {
        gameId: data.game.id,
        playerColor,
        currentUserId: data.currentUserId,
        opponentUserId: data.opponent.id,
        timeControl: data.game.timeControl,
        supabase,
        redPlayerName,
        bluePlayerName
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
      },
      (result) => {
        // onGameEnd callback
        gameResult = result;
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
              onlineSession.clockStatus !== 'running' ||
              !isMyTurn
          }}
          onApiReady={handleBoardReady}
        />
      {:else}
        <div class="board-loading-placeholder">
          <p>{i18n.t('game.connecting')}</p>
        </div>
      {/if}

      {#if onlineSession?.lifecycle === 'ended' && gameResult}
        <div class="result-overlay">
          <GameResultBanner
            result={gameResult}
            playerColor={data.playerColor as 'red' | 'blue'}
            onPlayAgain={() => goto('/play/online')}
          />
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
        <div class="status-right">
          <span class="move-counter">
            {i18n.t('game.moveCount').replace('{count}', String(moveCount))}
          </span>
          {#if opponentFlagged}
            <button
              class="claim-victory-btn"
              onclick={() => onlineSession?.claimVictory()}
            >
              {i18n.t('game.claimVictory')}
            </button>
          {:else}
            <button
              class="resign-btn"
              onclick={() => { resignDialogOpen = true; }}
            >
              {i18n.t('game.resignButton')}
            </button>
          {/if}
        </div>
      {:else}
        <span class="status-text">{statusLabel}</span>
      {/if}
    </div>

    <!-- Resign confirmation dialog -->
    <Dialog.Root bind:open={resignDialogOpen}>
      <Dialog.Portal>
        <Dialog.Overlay />
        <Dialog.Content>
          <Dialog.Header>
            <Dialog.Title>{i18n.t('game.resignConfirmTitle')}</Dialog.Title>
            <Dialog.Description>{i18n.t('game.resignConfirmMessage')}</Dialog.Description>
          </Dialog.Header>
          <Dialog.Footer>
            <Dialog.Close>{i18n.t('common.cancel')}</Dialog.Close>
            <button
              class="confirm-resign-btn"
              onclick={() => {
                resignDialogOpen = false;
                onlineSession?.resign();
              }}
            >
              {i18n.t('game.resignButton')}
            </button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>

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

  .result-overlay {
    position: absolute;
    left: 0.5rem;
    right: 0.5rem;
    bottom: 0.5rem;
    z-index: 20;
    display: flex;
    justify-content: center;
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

  .status-right {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .resign-btn {
    font-size: 0.6875rem;
    font-weight: 500;
    padding: 0.2rem 0.5rem;
    border-radius: 4px;
    border: 1px solid var(--theme-border, #333);
    background: transparent;
    color: var(--theme-text-secondary, #888);
    cursor: pointer;
    transition: color 0.15s, border-color 0.15s;
  }

  .resign-btn:hover {
    color: #ef4444;
    border-color: #ef4444;
  }

  .claim-victory-btn {
    font-size: 0.75rem;
    font-weight: 600;
    padding: 0.3rem 0.75rem;
    border-radius: 4px;
    border: 1px solid #22c55e;
    background: #22c55e;
    color: #000;
    cursor: pointer;
    animation: pulse-glow 1.5s ease-in-out infinite;
  }

  .claim-victory-btn:hover {
    background: #16a34a;
    border-color: #16a34a;
  }

  @keyframes pulse-glow {
    0%, 100% { box-shadow: 0 0 4px rgba(34, 197, 94, 0.4); }
    50% { box-shadow: 0 0 12px rgba(34, 197, 94, 0.7); }
  }

  .confirm-resign-btn {
    padding: 0.5rem 1rem;
    border-radius: 6px;
    border: 1px solid #ef4444;
    background: #ef4444;
    color: #fff;
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
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
