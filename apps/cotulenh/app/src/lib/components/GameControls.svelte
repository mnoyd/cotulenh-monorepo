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
    class="h-7 text-[0.65rem] font-bold tracking-wider uppercase border border-mw-primary/40 bg-mw-primary/10 text-mw-primary hover:bg-mw-primary/20 hover:text-mw-primary hover:shadow-[0_0_10px_rgba(0,243,255,0.3)]"
  >
    RESET
  </Button>
  <Button
    variant="destructive"
    size="sm"
    onclick={undoLastMove}
    title="Undo Last Move"
    class="h-7 text-[0.65rem] font-bold tracking-wider uppercase border border-mw-alert/40 bg-mw-alert/10 text-mw-alert hover:bg-mw-alert/20 hover:text-mw-alert hover:shadow-[0_0_10px_rgba(255,171,0,0.3)]"
  >
    UNDO
  </Button>
  <Button
    variant="outline"
    size="sm"
    onclick={flipBoard}
    title="Flip Board"
    class="h-7 text-[0.65rem] font-bold tracking-wider uppercase border border-cyan-400/40 bg-cyan-400/10 text-cyan-400 hover:bg-cyan-400/20 hover:text-cyan-400 hover:shadow-[0_0_10px_rgba(34,211,238,0.3)]"
  >
    FLIP
  </Button>
  <Button
    variant="outline"
    size="sm"
    onclick={openShare}
    title="Share Game"
    class="h-7 text-[0.65rem] font-bold tracking-wider uppercase border border-primary/40 text-primary/80 hover:bg-primary/10"
  >
    SHARE
  </Button>
  <Button
    variant="ghost"
    size="sm"
    onclick={reportIssue}
    title="Report Issue"
    class="h-7 text-[0.65rem] font-bold tracking-wider uppercase border border-white/20 text-white/60 hover:bg-white/10 hover:text-white"
  >
    REPORT
  </Button>
</div>

<ShareDialog
  bind:open={shareOpen}
  fen={session.fen}
/>
