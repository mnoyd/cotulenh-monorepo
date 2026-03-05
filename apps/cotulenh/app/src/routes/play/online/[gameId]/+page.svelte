<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { toast } from 'svelte-sonner';
  import BoardContainer from '$lib/components/BoardContainer.svelte';
  import MoveHistory from '$lib/components/MoveHistory.svelte';
  import OnlineIndicator from '$lib/components/OnlineIndicator.svelte';
  import ReconnectBanner from '$lib/components/ReconnectBanner.svelte';
  import GameResultBanner from '$lib/components/GameResultBanner.svelte';
  import CommandCenter from '$lib/components/CommandCenter.svelte';
  import * as Dialog from '$lib/components/ui/dialog';
  import { OnlineGameSession } from '$lib/game/online-session.svelte';
  import type { GameEndResult } from '$lib/game/online-session-core';
  import { setStoredValue } from '$lib/stores/persisted.svelte';
  import { formatClockTime } from '$lib/clock/clock.svelte';
  import { getI18n } from '$lib/i18n/index.svelte';
  import type { Api } from '@cotulenh/board';
  import type { PageData } from './$types';

  import '$lib/styles/board.css';
  import '$lib/styles/command-center.css';

  const i18n = getI18n();

  let { data }: { data: PageData } = $props();

  let onlineSession = $state<OnlineGameSession | null>(null);
  let boardComponent: BoardContainer | null = $state(null);
  let gameResult = $state<GameEndResult | null>(null);
  let resignDialogOpen = $state(false);

  function getOrientation(): 'red' | 'blue' {
    return data.playerColor === 'red' ? 'red' : 'blue';
  }

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
  let disputeActive = $derived(onlineSession?.disputeActive ?? false);
  let disputeInfo = $derived(onlineSession?.disputeInfo);
  let disputeDialogOpen = $derived(disputeActive && onlineSession?.lifecycle === 'playing');
  let disputeComment = $state('');
  let submittingDispute = $state(false);
  let drawOfferSent = $derived(onlineSession?.drawOfferSent ?? false);
  let drawOfferReceived = $derived(onlineSession?.drawOfferReceived ?? false);
  let canAbort = $derived(onlineSession?.canAbort ?? false);
  let rematchSent = $derived(onlineSession?.rematchSent ?? false);
  let rematchReceived = $derived(onlineSession?.rematchReceived ?? false);

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
        toast.info(i18n.t('game.gameAborted'));
        goto('/play/online');
      },
      (errorContext) => {
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
        gameResult = result;
      },
      undefined,
      (newGameId: string) => {
        goto(`/play/online/${newGameId}`);
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

  async function submitDispute(classification: 'bug' | 'cheat') {
    if (!onlineSession || submittingDispute) return;
    submittingDispute = true;
    try {
      await onlineSession.reportDispute(classification, disputeComment || undefined);
      disputeComment = '';
    } finally {
      submittingDispute = false;
    }
  }

  async function handleAcceptRematch() {
    await onlineSession?.acceptRematch();
    const newGameId = onlineSession?.rematchGameId;
    if (newGameId) {
      goto(`/play/online/${newGameId}`);
    }
  }

  $effect(() => {
    if (onlineSession) {
      onlineSession.session.setupBoardEffect();
    }
  });

  let tabs = $derived([
    { id: 'moves', label: i18n.t('tabs.moves'), content: movesTab },
    { id: 'game', label: i18n.t('tabs.game'), content: gameTab }
  ]);
</script>

<svelte:head>
  <title>{i18n.t('game.pageTitle')} | {i18n.t('nav.appName')}</title>
</svelte:head>

<CommandCenter center={centerContent} {tabs} />

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
          class="text-link danger"
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

<!-- Dispute classification dialog (non-dismissible) -->
<Dialog.Root open={disputeDialogOpen}>
  <Dialog.Portal>
    <Dialog.Overlay />
    <Dialog.Content
      showCloseButton={false}
      onInteractOutside={(e) => e.preventDefault()}
      onEscapeKeydown={(e) => e.preventDefault()}
    >
      <Dialog.Header>
        <Dialog.Title>{i18n.t('game.disputeTitle')}</Dialog.Title>
        <Dialog.Description>
          {i18n.t('game.disputeMessage')}
          {#if disputeInfo}
            <br /><code class="dispute-san">{disputeInfo.san}</code>
          {/if}
        </Dialog.Description>
      </Dialog.Header>
      <div class="dispute-form">
        <textarea
          class="dispute-comment"
          bind:value={disputeComment}
          placeholder={i18n.t('game.disputeCommentPlaceholder')}
          rows="2"
          disabled={submittingDispute}
        ></textarea>
      </div>
      <Dialog.Footer>
        <button
          class="text-link"
          onclick={() => void submitDispute('bug')}
          disabled={submittingDispute}
        >
          {i18n.t('game.reportBug')}
        </button>
        <button
          class="text-link danger"
          onclick={() => void submitDispute('cheat')}
          disabled={submittingDispute}
        >
          {i18n.t('game.reportCheat')}
        </button>
      </Dialog.Footer>
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>

{#snippet centerContent()}
  <div class="board-area">
    <!-- Opponent bar -->
    <div class="player-bar">
      <div class="player-info">
        <OnlineIndicator online={onlineSession?.opponentConnected ?? false} />
        <span class="player-name">{data.opponent.displayName}</span>
      </div>
      <span class="clock" class:active={opponentClockActive}>
        {formatClockTime(opponentTime)}
      </span>
    </div>

    <!-- Board -->
    {#if onlineSession}
      <BoardContainer
        bind:this={boardComponent}
        config={{
          ...onlineSession.session.boardConfig,
          orientation: getOrientation(),
          viewOnly:
            onlineSession.lifecycle !== 'playing' ||
            onlineSession.connectionState !== 'connected' ||
            onlineSession.clockStatus !== 'running' ||
            onlineSession.disputeActive ||
            !isMyTurn
        }}
        onApiReady={handleBoardReady}
      />
    {:else}
      <div class="board-placeholder">
        <span class="text-secondary">{i18n.t('game.connecting')}</span>
      </div>
    {/if}

    {#if onlineSession?.lifecycle === 'ended' && gameResult}
      <div class="result-overlay">
        <GameResultBanner
          result={gameResult}
          playerColor={data.playerColor as 'red' | 'blue'}
          onPlayAgain={() => goto('/play/online')}
          onRematch={() => onlineSession?.requestRematch()}
          {rematchSent}
          {rematchReceived}
          onAcceptRematch={handleAcceptRematch}
          onDeclineRematch={() => onlineSession?.declineRematch()}
        />
      </div>
    {/if}

    <ReconnectBanner visible={showDisconnectBanner} />

    <!-- Player bar -->
    <div class="player-bar">
      <div class="player-info">
        <span class="color-dot {data.playerColor}"></span>
        <span class="player-name">{i18n.t('common.play')}</span>
      </div>
      <span class="clock" class:active={playerClockActive}>
        {formatClockTime(playerTime)}
      </span>
    </div>
  </div>
{/snippet}

{#snippet movesTab()}
  {#if onlineSession}
    <MoveHistory session={onlineSession.session} />
  {:else}
    <p class="text-secondary">No moves yet</p>
  {/if}
{/snippet}

{#snippet gameTab()}
  <div class="game-tab">
    <span class="section-header">Status</span>
    {#if onlineSession?.lifecycle === 'playing'}
      <div class="game-status">
        <span class="status-label" class:my-turn={isMyTurn}>{statusLabel}</span>
        <span class="text-secondary mono">
          {i18n.t('game.moveCount').replace('{count}', String(moveCount))}
        </span>
      </div>
    {:else}
      <span class="text-secondary">{statusLabel}</span>
    {/if}

    <hr class="divider" />

    {#if onlineSession?.lifecycle === 'playing'}
      {#if !opponentFlagged && !disputeActive}
        {#if drawOfferSent}
          <span class="text-secondary">{i18n.t('game.drawOfferSent')}</span>
        {:else if drawOfferReceived}
          <div class="draw-offer">
            <span class="text-secondary">{i18n.t('game.drawOfferReceived')}</span>
            <div class="game-actions">
              <button class="text-link" onclick={() => onlineSession?.acceptDraw()}>
                {i18n.t('game.acceptDraw')}
              </button>
              <button class="text-link" onclick={() => onlineSession?.declineDraw()}>
                {i18n.t('game.declineDraw')}
              </button>
            </div>
          </div>
        {:else}
          <button class="text-link" onclick={() => onlineSession?.offerDraw()}>
            {i18n.t('game.offerDraw')}
          </button>
        {/if}
      {/if}

      <div class="game-actions">
        {#if opponentFlagged}
          <button class="text-link accent" onclick={() => onlineSession?.claimVictory()}>
            {i18n.t('game.claimVictory')}
          </button>
        {:else if canAbort}
          <button class="text-link" onclick={() => void onlineSession?.abort()}>
            {i18n.t('game.abortGame')}
          </button>
        {:else}
          <button class="text-link" onclick={() => { resignDialogOpen = true; }}>
            {i18n.t('game.resignButton')}
          </button>
        {/if}
      </div>
    {/if}

    <hr class="divider" />

    <span class="section-header">Chat</span>
    <p class="text-secondary">Chat coming soon</p>
  </div>
{/snippet}

<style>
  .board-area {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
  }

  .board-placeholder {
    width: 100%;
    aspect-ratio: 12 / 13;
    background: var(--theme-bg-dark, #111);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .player-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    padding: 0.25rem 0;
  }

  .player-info {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .player-name {
    font-size: 0.8125rem;
    font-weight: 600;
    color: var(--theme-text-primary, #eee);
  }

  .color-dot {
    width: 8px;
    height: 8px;
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
    font-size: 1.125rem;
    font-weight: 700;
    color: var(--theme-text-secondary, #888);
    min-width: 5ch;
    text-align: right;
  }

  .clock.active {
    color: var(--theme-text-primary, #fff);
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

  .text-secondary {
    color: var(--theme-text-secondary, #aaa);
    font-size: 0.8125rem;
  }

  .mono {
    font-family: var(--font-mono, monospace);
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
  }

  .status-label {
    font-size: 0.8125rem;
    font-weight: 600;
    text-transform: uppercase;
    color: var(--theme-text-secondary, #aaa);
  }

  .status-label.my-turn {
    color: var(--theme-primary, #06b6d4);
  }

  .draw-offer {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .game-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
  }

  .danger {
    color: #ef4444;
  }

  .accent {
    color: var(--theme-primary, #06b6d4);
  }

  .dispute-san {
    display: inline-block;
    margin-top: 0.25rem;
    padding: 0.125rem 0.375rem;
    background: rgba(239, 68, 68, 0.1);
    font-family: var(--font-mono, monospace);
    font-size: 0.875rem;
    color: var(--color-error, #ef4444);
  }

  .dispute-form {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .dispute-comment {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid var(--theme-border, #333);
    background: var(--theme-bg-panel, #1a1a1a);
    color: var(--theme-text-primary, #eee);
    font-size: 0.8125rem;
    resize: vertical;
  }
</style>
