<script lang="ts">
  import type { GameSession } from '$lib/game-session.svelte';
  import { goto } from '$app/navigation';
  import { logRender } from '$lib/debug';
  import { setStoredValue } from '$lib/stores/persisted.svelte';
  import { Button } from '$lib/components/ui/button';
  import ShareDialog from './ShareDialog.svelte';

  interface Props {
    session: GameSession;
  }

  let { session }: Props = $props();

  let shareOpen = $state(false);

  // Log renders in effect to avoid capturing stale values
  $effect(() => {
    logRender('🔄 [RENDER] GameControls.svelte component rendered', { session: !!session });
  });

  function resetGame() {
    if (confirm('Are you sure you want to reset the game?')) {
      session.reset();
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
    title="Reset Game"
    class="btn-game-primary"
  >
    RESET
  </Button>
  <Button
    variant="destructive"
    size="sm"
    onclick={undoLastMove}
    title="Undo Last Move"
    class="btn-game-alert"
  >
    UNDO
  </Button>
  <Button
    variant="outline"
    size="sm"
    onclick={flipBoard}
    title="Flip Board"
    class="btn-game-secondary"
  >
    FLIP
  </Button>
  <Button
    variant="outline"
    size="sm"
    onclick={openShare}
    title="Share Game"
    class="btn-game-subtle"
  >
    SHARE
  </Button>
  <Button
    variant="ghost"
    size="sm"
    onclick={reportIssue}
    title="Report Issue"
    class="btn-game-ghost"
  >
    REPORT
  </Button>
</div>

<ShareDialog bind:open={shareOpen} fen={session.fen} />
