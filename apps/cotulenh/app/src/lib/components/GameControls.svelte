<script lang="ts">
  import { logger } from '@cotulenh/common';
  import { CoTuLenh } from '@cotulenh/core';
  import { gameState } from '$lib/stores/game.svelte';
  import { goto } from '$app/navigation';
  import { Button } from '$lib/components/ui/button';
  import { toast } from 'svelte-sonner';
  import ShareDialog from './ShareDialog.svelte';

  interface Props {
    game: CoTuLenh | null;
    originalFen: string | undefined;
  }

  let { game = $bindable(), originalFen }: Props = $props();

  let shareOpen = $state(false);

  function resetGame() {
    if (!game) return;
    // Reset to the original FEN from URL or default starting position
    game = originalFen ? new CoTuLenh(originalFen) : new CoTuLenh();
    gameState.initialize(game);
    toast.success('Game reset');
  }

  function undoLastMove() {
    if (!game) return;
    game.undo();
    gameState.handleUndo(game);
  }

  function openShare() {
    if (!game) return;
    shareOpen = true;
  }

  function reportIssue() {
    if (!game) return;

    // Capture current state for report
    const currentState = {
      fen: gameState.fen,
      turn: gameState.turn,
      history: gameState.history,
      status: gameState.status,
      check: gameState.check
    };

    localStorage.setItem('report_fen', game.fen());
    // Safe stringify to handle circular references if any
    try {
      localStorage.setItem('report_state', JSON.stringify(currentState, null, 2));
    } catch (e) {
      logger.error(e, 'Failed to serialize game state');
      localStorage.setItem('report_state', 'Error serializing state');
    }

    goto('/report-issue');
  }
</script>

<div class="grid grid-cols-2 gap-2 mt-2">
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

<ShareDialog bind:open={shareOpen} fen={game ? game.fen() : ''} />
