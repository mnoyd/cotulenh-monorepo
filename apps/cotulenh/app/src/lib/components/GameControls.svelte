<script lang="ts">
  import { logger } from '@cotulenh/common';
  import { CoTuLenh } from '@cotulenh/core';
  import { gameState } from '$lib/stores/game';
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

  async function copyFen() {
    if (!game) return;
    const fen = game.fen();
    try {
      await navigator.clipboard.writeText(fen);
      toast.success('FEN copied to clipboard');
    } catch (err) {
      toast.error('Failed to copy FEN');
    }
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

<div class="controls-mini">
  <Button variant="default" size="sm" onclick={resetGame} title="Reset Game">RESET</Button>
  <Button variant="destructive" size="sm" onclick={undoLastMove} title="Undo Last Move">UNDO</Button>
  <Button variant="secondary" size="sm" onclick={copyFen} title="Copy FEN to Clipboard">FEN</Button>
  <Button variant="outline" size="sm" onclick={openShare} title="Share Game">SHARE</Button>
  <Button variant="ghost" size="sm" onclick={reportIssue} title="Report Issue">REPORT</Button>
</div>

<ShareDialog bind:open={shareOpen} fen={game ? game.fen() : ''} />

<style>
  .controls-mini {
    display: flex;
    gap: 4px;
    margin-top: 8px;
  }

  /* Override button styles for Modern Warfare theme */
  .controls-mini :global(button) {
    font-size: 0.65rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    padding: 0.5rem 0.25rem;
    min-height: 32px;
    flex: 1;
    border-radius: 2px;
    transition: all 0.2s ease;
  }

  /* Cyan primary (UNDO) */
  .controls-mini :global(button[data-variant='default']) {
    background: rgba(0, 243, 255, 0.15);
    border-color: rgba(0, 243, 255, 0.4);
    color: #00f3ff;
    box-shadow:
      0 0 8px rgba(0, 243, 255, 0.1),
      inset 0 0 10px rgba(0, 243, 255, 0.05);
  }

  .controls-mini :global(button[data-variant='default']:hover) {
    background: rgba(0, 243, 255, 0.25);
    border-color: rgba(0, 243, 255, 0.8);
    box-shadow:
      0 0 15px rgba(0, 243, 255, 0.3),
      inset 0 0 15px rgba(0, 243, 255, 0.1);
    text-shadow: 0 0 8px rgba(0, 243, 255, 0.8);
  }

  /* Destructive/Amber (RESET) */
  .controls-mini :global(button[data-variant='destructive']) {
    background: rgba(255, 171, 0, 0.15);
    border-color: rgba(255, 171, 0, 0.4);
    color: #ffab00;
    box-shadow:
      0 0 8px rgba(255, 171, 0, 0.1),
      inset 0 0 10px rgba(255, 171, 0, 0.05);
  }

  .controls-mini :global(button[data-variant='destructive']:hover) {
    background: rgba(255, 171, 0, 0.25);
    border-color: rgba(255, 171, 0, 0.8);
    box-shadow:
      0 0 15px rgba(255, 171, 0, 0.3),
      inset 0 0 15px rgba(255, 171, 0, 0.1);
    text-shadow: 0 0 8px rgba(255, 171, 0, 0.8);
  }

  /* Secondary/Green (FEN) */
  .controls-mini :global(button[data-variant='secondary']) {
    background: rgba(0, 255, 65, 0.15);
    border-color: rgba(0, 255, 65, 0.4);
    color: #00ff41;
    box-shadow:
      0 0 8px rgba(0, 255, 65, 0.1),
      inset 0 0 10px rgba(0, 255, 65, 0.05);
  }

  .controls-mini :global(button[data-variant='secondary']:hover) {
    background: rgba(0, 255, 65, 0.25);
    border-color: rgba(0, 255, 65, 0.8);
    box-shadow:
      0 0 15px rgba(0, 255, 65, 0.3),
      inset 0 0 15px rgba(0, 255, 65, 0.1);
    text-shadow: 0 0 8px rgba(0, 255, 65, 0.8);
  }

  /* Outline (SHARE) */
  .controls-mini :global(button[data-variant='outline']) {
    background: rgba(139, 92, 246, 0.15);
    border-color: rgba(139, 92, 246, 0.4);
    color: #a78bfa;
    box-shadow: 0 0 8px rgba(139, 92, 246, 0.1);
  }

  .controls-mini :global(button[data-variant='outline']:hover) {
    background: rgba(139, 92, 246, 0.25);
    border-color: rgba(139, 92, 246, 0.8);
    box-shadow: 0 0 15px rgba(139, 92, 246, 0.3);
    text-shadow: 0 0 8px rgba(139, 92, 246, 0.8);
  }

  /* Ghost (REPORT) */
  .controls-mini :global(button[data-variant='ghost']) {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.2);
    color: rgba(255, 255, 255, 0.6);
  }

  .controls-mini :global(button[data-variant='ghost']:hover) {
    background: rgba(255, 255, 255, 0.15);
    border-color: rgba(255, 255, 255, 0.4);
    color: #fff;
  }
</style>
