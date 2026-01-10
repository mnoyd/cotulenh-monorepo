<script lang="ts">
  import { logger } from '@cotulenh/common';
  import type { GameSession } from '$lib/game-session.svelte';
  import { goto } from '$app/navigation';
  import { logRender } from '$lib/debug';
  import { Button } from '$lib/components/ui/button';
  import ShareDialog from './ShareDialog.svelte';

  interface Props {
    session: GameSession;
  }

  let { session }: Props = $props();

  let shareOpen = $state(false);

  // Log renders
  logRender('🔄 [RENDER] GameControls.svelte component rendered', { session: !!session });

  function resetGame() {
    if (confirm('Are you sure you want to reset the game?')) {
      session.reset();
    }
  }

  function undoLastMove() {
    if (session.canUndo) {
      session.undo();
    }
  }

  function flipBoard() {
    session.flipBoard();
  }

  function openShare() {
    shareOpen = true;
  }

  function reportIssue() {
    // Capture current state for report
    const currentState = {
      fen: session.fen,
      turn: session.turn,
      history: session.history,
      status: session.status,
      check: session.check
    };

    localStorage.setItem('report_fen', session.fen);
    try {
      localStorage.setItem('report_state', JSON.stringify(currentState, null, 2));
    } catch (e) {
      logger.error(e, 'Failed to serialize game state');
      localStorage.setItem('report_state', 'Error serializing state');
    }

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

<ShareDialog
  bind:open={shareOpen}
  fen={session.fen}
/>
