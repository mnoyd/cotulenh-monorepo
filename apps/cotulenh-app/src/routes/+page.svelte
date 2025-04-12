<script lang="ts">
  import { onMount } from 'svelte';
  import { CommanderChessBoard } from '@repo/cotulenh-board'; 
  import type { Api } from '@repo/cotulenh-board/api'; 
  import '@repo/cotulenh-board/assets/commander-chess.base.css';
  import '@repo/cotulenh-board/assets/commander-chess.pieces.css';
  import '@repo/cotulenh-board/assets/commander-chess.clasic.css';

  let boardContainerElement: HTMLElement | null = null;
  let boardApi: Api | null = null; 

  onMount(() => {
    if (boardContainerElement) {
      boardApi = CommanderChessBoard(boardContainerElement, {
      });
    }
  });

</script>

<main>
  <h1>CoTuLenh Chess</h1>

  <div class="game-area">
    <div class="board-container" bind:this={boardContainerElement}>
    </div>

    <div class="game-info">
      <h2>Game Info</h2>
      <p>Turn: ...</p>
      <p>Orientation: ...</p>
      <h3>Move History</h3>
      <ul>
         <li>Move history unavailable.</li>
      </ul>
    </div>
  </div>
</main>

<style>
  .board-container {
    width: 500px; 
    aspect-ratio: 12 / 13;
    position: relative; 
  }
</style>
