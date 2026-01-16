<script lang="ts">
  import type { GameSession } from '$lib/game-session.svelte';
  import { goto } from '$app/navigation';
  import { logRender } from '$lib/debug';
  import { setStoredValue } from '$lib/stores/persisted.svelte';
  import { Button } from '$lib/components/ui/button';
  import ShareDialog from './ShareDialog.svelte';
  import { getI18n } from '$lib/i18n/index.svelte';

  const i18n = getI18n();

  interface Props {
    session: GameSession;
    onReset?: () => void;
  }

  let { session, onReset }: Props = $props();

  let shareOpen = $state(false);

  // Log renders in effect to avoid capturing stale values
  $effect(() => {
    logRender('🔄 [RENDER] GameControls.svelte component rendered', { session: !!session });
  });

  function resetGame() {
    if (confirm(i18n.t('game.resetConfirm'))) {
      session.reset();
      onReset?.();
    }
  }

  function undoLastMove() {
    session.undo();
  }

  function flipBoard() {
    session.flipBoard();
  }

  function openShare() {
    shareOpen = true;
  }

  function reportIssue() {
    // Capture current game state as PGN (includes FEN if non-standard position)
    setStoredValue('report_pgn', session.pgn);

    goto('/report-issue');
  }
</script>

<div class="grid grid-cols-2 lg:grid-cols-5 gap-2 mt-2">
  <Button
    variant="default"
    size="sm"
    onclick={resetGame}
    title={i18n.t('common.reset')}
    class="btn-game-primary"
  >
    {i18n.t('common.reset')}
  </Button>
  <Button
    variant="destructive"
    size="sm"
    onclick={undoLastMove}
    title={i18n.t('common.undo')}
    class="btn-game-alert"
  >
    {i18n.t('common.undo')}
  </Button>
  <Button
    variant="outline"
    size="sm"
    onclick={flipBoard}
    title={i18n.t('common.flip')}
    class="btn-game-secondary"
  >
    {i18n.t('common.flip')}
  </Button>
  <Button
    variant="outline"
    size="sm"
    onclick={openShare}
    title={i18n.t('common.share')}
    class="btn-game-subtle"
  >
    {i18n.t('common.share')}
  </Button>
  <Button
    variant="ghost"
    size="sm"
    onclick={reportIssue}
    title={i18n.t('common.report')}
    class="btn-game-ghost"
  >
    {i18n.t('common.report')}
  </Button>
</div>

<ShareDialog bind:open={shareOpen} fen={session.fen} />
