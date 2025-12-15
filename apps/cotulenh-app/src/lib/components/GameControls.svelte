<script lang="ts">
  import { CoTuLenh } from '@repo/cotulenh-core';
  import { gameStore } from '$lib/stores/game';

  export let game: CoTuLenh | null = null;

  function resetGame() {
    if (!game) return;
    if (!confirm('Abort current simulation and reset board?')) return;
    game = new CoTuLenh();
    gameStore.initialize(game);
  }

  function reportIssue() {
    if (!game) return;
    const fen = game.fen();
    const history = game.history().join(' ');
    const title = 'Game Issue Report';
    const body = `FEN: \`${fen}\`\n\nHistory: \`${history}\`\n\nDescription: `;
    const url = `https://github.com/mnoyd/cotulenh-monorepo/issues/new?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`;
    window.open(url, '_blank');
  }

  function copyFen() {
    if (!game) return;
    const fen = game.fen();
    navigator.clipboard.writeText(fen).then(() => {
        alert('FEN Access Code copied to clipboard');
    });
    console.log('FEN:', fen);
  }
</script>

<div class="controls-grid">
  <button class="tactical-btn reset" on:click={resetGame} title="Reset Game">
    <span class="icon">↻</span>
    <span class="label">RESET</span>
  </button>

  <button class="tactical-btn debug" on:click={copyFen} title="Copy FEN">
    <span class="icon">#</span>
    <span class="label">FEN</span>
  </button>

  <button class="tactical-btn report" on:click={reportIssue} title="Report Issue">
    <span class="icon">!</span>
    <span class="label">ISSUE</span>
  </button>
</div>

<style>
  .controls-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--spacing-sm);
    padding: var(--spacing-sm);
  }

  .tactical-btn {
    aspect-ratio: 1;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: var(--mw-text-secondary);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s;
    border-radius: 2px;
  }

  .tactical-btn:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: var(--mw-primary);
    color: var(--mw-primary);
    transform: translateY(-2px);
  }

  .icon {
    font-size: 1.5rem;
    font-weight: 700;
    margin-bottom: 4px;
  }

  .label {
    font-size: 0.7rem;
    font-weight: 600;
    letter-spacing: 0.1em;
  }

  .reset:hover { border-color: var(--color-warning); color: var(--color-warning); }
  .report:hover { border-color: var(--color-error); color: var(--color-error); }
  .debug:hover { border-color: var(--color-info); color: var(--color-info); }
</style>

