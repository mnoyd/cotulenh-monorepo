<script lang="ts">
  import { CoTuLenh } from '@repo/cotulenh-core';
  import { gameStore } from '$lib/stores/game';

  export let game: CoTuLenh | null = null;

  function resetGame() {
    if (!game) return;
    game = new CoTuLenh();
    gameStore.initialize(game);
  }

  function printFen() {
    if (!game) return;
    console.log('Current FEN:', game.fen());
    alert('FEN logged to console');
  }

  function reportIssue() {
    console.log('Report issue clicked');
    alert('Issue reported (simulated)');
  }
</script>

<div class="controls-mini">
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
