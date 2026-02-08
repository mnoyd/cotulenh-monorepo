<script lang="ts">
  import { getI18n } from '$lib/i18n/index.svelte';
  import { getPuzzles, type PuzzleDifficulty } from '$lib/puzzles';
  import { Puzzle, Play, ChevronRight } from 'lucide-svelte';

  const i18n = getI18n();

  const locale = $derived(i18n.getLocale());
  const puzzles = $derived(getPuzzles(locale));

  function getDifficultyColor(difficulty: PuzzleDifficulty): string {
    switch (difficulty) {
      case 'easy':
        return 'difficulty-easy';
      case 'medium':
        return 'difficulty-medium';
      case 'hard':
        return 'difficulty-hard';
      default:
        return '';
    }
  }

  function getDifficultyLabel(difficulty: PuzzleDifficulty): string {
    switch (difficulty) {
      case 'easy':
        return i18n.t('common.easy');
      case 'medium':
        return i18n.t('common.medium');
      case 'hard':
        return i18n.t('common.hard');
      default:
        return difficulty;
    }
  }

  function getPlayUrl(fen: string): string {
    return `/play?fen=${encodeURIComponent(fen)}`;
  }
</script>

<main class="puzzles-page">
  <div class="puzzles-container">
    <header class="puzzles-header">
      <div class="header-icon">
        <Puzzle size={32} />
      </div>
      <h1>{i18n.t('puzzles.title')}</h1>
      <p class="subtitle">{i18n.t('puzzles.subtitle')}</p>
    </header>

    <div class="puzzles-grid">
      {#each puzzles as puzzle}
        <article class="puzzle-card">
          <div class="puzzle-header">
            <span class="puzzle-number">#{puzzle.id}</span>
            <span class="puzzle-difficulty {getDifficultyColor(puzzle.difficulty)}">
              {getDifficultyLabel(puzzle.difficulty)}
            </span>
          </div>

          <h2 class="puzzle-title">{puzzle.title}</h2>
          <p class="puzzle-description">{puzzle.description}</p>

          {#if puzzle.hint}
            <details class="puzzle-hint">
              <summary>{i18n.t('puzzles.showHint')}</summary>
              <p>{puzzle.hint}</p>
            </details>
          {/if}

          <a href={getPlayUrl(puzzle.fen)} class="play-button">
            <Play size={18} />
            <span>{i18n.t('puzzles.play')}</span>
            <ChevronRight size={18} />
          </a>
        </article>
      {/each}
    </div>

    <div class="puzzles-footer">
      <p>{i18n.t('puzzles.comingSoon')}</p>
      <a href="/board-editor" class="create-link">{i18n.t('puzzles.createOwn')}</a>
    </div>
  </div>
</main>

<style>
  .puzzles-page {
    min-height: 100vh;
    background: var(--theme-bg-dark, #000);
    color: var(--theme-text-primary, #eee);
    font-family: var(--font-ui);
    padding: 2rem 1rem;
  }

  .puzzles-container {
    max-width: 900px;
    margin: 0 auto;
  }

  .puzzles-header {
    text-align: center;
    margin-bottom: 2.5rem;
  }

  .header-icon {
    color: #22c55e;
    margin-bottom: 1rem;
  }

  .puzzles-header h1 {
    font-size: 2rem;
    margin: 0 0 0.5rem 0;
    font-weight: 700;
  }

  .subtitle {
    color: var(--theme-text-secondary, #aaa);
    margin: 0;
  }

  .puzzles-grid {
    display: grid;
    gap: 1rem;
  }

  .puzzle-card {
    background: var(--theme-bg-panel, #222);
    border: 1px solid var(--theme-border, #444);
    border-radius: 12px;
    padding: 1.25rem;
  }

  .puzzle-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.75rem;
  }

  .puzzle-number {
    font-family: var(--font-mono);
    color: var(--theme-text-secondary, #aaa);
    font-size: 0.875rem;
  }

  .puzzle-difficulty {
    font-size: 0.75rem;
    font-weight: 600;
    padding: 0.25rem 0.75rem;
    border-radius: 9999px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .difficulty-easy {
    background: rgba(34, 197, 94, 0.2);
    color: #22c55e;
  }

  .difficulty-medium {
    background: rgba(234, 179, 8, 0.2);
    color: #eab308;
  }

  .difficulty-hard {
    background: rgba(239, 68, 68, 0.2);
    color: #ef4444;
  }

  .puzzle-title {
    font-size: 1.25rem;
    margin: 0 0 0.5rem 0;
    font-weight: 600;
  }

  .puzzle-description {
    color: var(--theme-text-secondary, #aaa);
    margin: 0 0 1rem 0;
    font-size: 0.9rem;
    line-height: 1.5;
  }

  .puzzle-hint {
    margin-bottom: 1rem;
    font-size: 0.875rem;
  }

  .puzzle-hint summary {
    cursor: pointer;
    color: #06b6d4;
    font-weight: 500;
  }

  .puzzle-hint summary:hover {
    text-decoration: underline;
  }

  .puzzle-hint p {
    margin: 0.5rem 0 0 0;
    color: var(--theme-text-secondary, #aaa);
    padding-left: 1rem;
    border-left: 2px solid var(--theme-border, #444);
  }

  .play-button {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.625rem 1.25rem;
    background: #22c55e;
    color: #000;
    border-radius: 8px;
    font-weight: 600;
    text-decoration: none;
    font-size: 0.9rem;
  }

  .play-button:hover {
    background: #16a34a;
  }

  .puzzles-footer {
    text-align: center;
    margin-top: 2rem;
    padding-top: 2rem;
    border-top: 1px solid var(--theme-border, #444);
  }

  .puzzles-footer p {
    color: var(--theme-text-secondary, #aaa);
    margin: 0 0 0.5rem 0;
  }

  .create-link {
    color: #06b6d4;
    text-decoration: none;
    font-weight: 500;
  }

  .create-link:hover {
    text-decoration: underline;
  }
</style>
