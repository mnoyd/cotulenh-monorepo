<script lang="ts">
  import { logger } from '@cotulenh/common';
  import { CoTuLenh } from '@cotulenh/core';
  import { gameStore } from '$lib/stores/game';
  import { goto } from '$app/navigation';
  import { get } from 'svelte/store';

  export let game: CoTuLenh | null = null;
  export let originalFen: string | undefined = undefined;

  function resetGame() {
    if (!game) return;
    // Reset to the original FEN from URL or default starting position
    game = originalFen ? new CoTuLenh(originalFen) : new CoTuLenh();
    gameStore.initialize(game);
  }

  function undoLastMove() {
    if (!game) return;
    game.undo();
    gameStore.handleUndo(game);
  }

  async function copyFen() {
    if (!game) return;
    const fen = game.fen();
    try {
      await navigator.clipboard.writeText(fen);
      logger.info('FEN copied to clipboard:', { fen });
    } catch (err) {
      logger.error(err, 'Failed to copy FEN to clipboard');
    }
  }

  function reportIssue() {
    if (!game) return;

    const currentState = get(gameStore);
    localStorage.setItem('report_fen', game.fen());
    // Safe stringify to handle circular references if any (though gameStore shouldn't have many)
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
  <button class="control-btn undo-btn" on:click={undoLastMove} title="Undo Last Move"> UNDO </button>
  <button class="control-btn reset-btn" on:click={resetGame} title="Reset Game"> RESET </button>
  <button class="control-btn fen-btn" on:click={copyFen} title="Copy FEN to Clipboard"> FEN </button>
  <button class="control-btn report-btn" on:click={reportIssue} title="Report Issue"> REPORT </button>
</div>

<style>
  .controls-mini {
    display: flex;
    gap: 4px;
    margin-top: 8px;
  }

  .control-btn {
    flex: 1;
    background: rgba(15, 23, 42, 0.9);
    border: 1px solid rgba(0, 255, 255, 0.15);
    color: #e0e0e0;
    font-size: 0.7rem;
    font-weight: 700;
    padding: 6px 4px;
    cursor: pointer;
    transition: all 0.2s ease;
    border-radius: 2px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    position: relative;
    overflow: hidden;
  }

  .control-btn::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(135deg, transparent 40%, rgba(255, 255, 255, 0.05) 50%, transparent 60%);
    opacity: 0;
    transition: opacity 0.3s;
  }

  .control-btn:hover::before {
    opacity: 1;
  }

  .control-btn:hover {
    color: #fff;
    transform: translateY(-1px);
  }

  .control-btn:active {
    transform: translateY(1px);
  }

  /* UNDO - Cyan (primary color) */
  .undo-btn {
    border-color: rgba(0, 243, 255, 0.4);
    box-shadow: 0 0 8px rgba(0, 243, 255, 0.1), inset 0 0 10px rgba(0, 243, 255, 0.05);
  }
  .undo-btn:hover {
    background: rgba(0, 243, 255, 0.15);
    border-color: rgba(0, 243, 255, 0.8);
    box-shadow: 0 0 15px rgba(0, 243, 255, 0.3), inset 0 0 15px rgba(0, 243, 255, 0.1);
    text-shadow: 0 0 8px rgba(0, 243, 255, 0.8);
  }

  /* RESET - Amber/Orange (alert color) */
  .reset-btn {
    border-color: rgba(255, 171, 0, 0.4);
    box-shadow: 0 0 8px rgba(255, 171, 0, 0.1), inset 0 0 10px rgba(255, 171, 0, 0.05);
  }
  .reset-btn:hover {
    background: rgba(255, 171, 0, 0.15);
    border-color: rgba(255, 171, 0, 0.8);
    box-shadow: 0 0 15px rgba(255, 171, 0, 0.3), inset 0 0 15px rgba(255, 171, 0, 0.1);
    text-shadow: 0 0 8px rgba(255, 171, 0, 0.8);
  }

  /* FEN - Green (secondary color) */
  .fen-btn {
    border-color: rgba(0, 255, 65, 0.4);
    box-shadow: 0 0 8px rgba(0, 255, 65, 0.1), inset 0 0 10px rgba(0, 255, 65, 0.05);
  }
  .fen-btn:hover {
    background: rgba(0, 255, 65, 0.15);
    border-color: rgba(0, 255, 65, 0.8);
    box-shadow: 0 0 15px rgba(0, 255, 65, 0.3), inset 0 0 15px rgba(0, 255, 65, 0.1);
    text-shadow: 0 0 8px rgba(0, 255, 65, 0.8);
  }

  /* REPORT - Gold/Warning color */
  .report-btn {
    border-color: rgba(255, 215, 0, 0.4);
    box-shadow: 0 0 8px rgba(255, 215, 0, 0.1), inset 0 0 10px rgba(255, 215, 0, 0.05);
  }
  .report-btn:hover {
    background: rgba(255, 215, 0, 0.15);
    border-color: rgba(255, 215, 0, 0.8);
    box-shadow: 0 0 15px rgba(255, 215, 0, 0.3), inset 0 0 15px rgba(255, 215, 0, 0.1);
    text-shadow: 0 0 8px rgba(255, 215, 0, 0.8);
  }
</style>
