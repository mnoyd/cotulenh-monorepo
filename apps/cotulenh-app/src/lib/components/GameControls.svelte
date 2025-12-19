<script lang="ts">
  import { CoTuLenh } from '@repo/cotulenh-core';
  import { gameStore } from '$lib/stores/game';
  import { goto } from '$app/navigation';
  import { get } from 'svelte/store';

  export let game: CoTuLenh | null = null;

  function resetGame() {
    if (!game) return;
    game = new CoTuLenh();
    gameStore.initialize(game);
  }

  function undoLastMove() {
    if (!game) return;
    game.undo();
    gameStore.handleUndo(game);
  }

  function printFen() {
    if (!game) return;
    console.log('Current FEN:', game.fen());
    alert('FEN logged to console');
  }

  function reportIssue() {
    if (!game) return;

    const currentState = get(gameStore);
    localStorage.setItem('report_fen', game.fen());
    // Safe stringify to handle circular references if any (though gameStore shouldn't have many)
    try {
      localStorage.setItem('report_state', JSON.stringify(currentState, null, 2));
    } catch (e) {
      console.error('Failed to serialize game state', e);
      localStorage.setItem('report_state', 'Error serializing state');
    }

    goto('/report-issue');
  }
</script>

<div class="controls-mini">
  <button class="control-btn" on:click={undoLastMove} title="Undo Last Move"> UNDO </button>
  <button class="control-btn" on:click={resetGame} title="Reset Game"> RESET </button>
  <button class="control-btn" on:click={printFen} title="Print FEN to Console"> FEN </button>
  <button class="control-btn" on:click={reportIssue} title="Report Issue"> REPORT </button>
</div>

<style>
  .controls-mini {
    display: flex;
    gap: 4px;
    margin-top: 8px;
  }

  .control-btn {
    flex: 1;
    background: #333;
    border: 1px solid #444;
    color: #aeaeae;
    font-size: 0.7rem;
    font-weight: 700;
    padding: 6px 4px;
    cursor: pointer;
    transition: all 0.2s;
    border-radius: 2px;
  }

  .control-btn:hover {
    background: #444;
    color: #fff;
    border-color: #555;
  }

  .control-btn:active {
    background: #222;
    transform: translateY(1px);
  }
</style>
