<script lang="ts">
  import { getI18n } from '$lib/i18n/index.svelte';
  import CommandCenter from '$lib/components/CommandCenter.svelte';
  import '$lib/styles/command-center.css';

  const i18n = getI18n();

  interface PzData {
    id: number;
    title: string;
    description: string;
    difficulty: 'Easy' | 'Medium' | 'Hard';
    fen: string;
    hint?: string;
  }

  const puzzles: PzData[] = [
    {
      id: 1,
      title: 'Commander Capture',
      description: 'Red to move. Find the winning move to capture the blue commander.',
      difficulty: 'Easy',
      fen: '11/11/11/11/11/11/5+IC4/8c2/11/11/11/11 r - - 0 1',
      hint: 'Try to conner the blue commander, mirror their moves. Avoid stalemate'
    },
    {
      id: 2,
      title: 'Combined Arms',
      description: 'Must win in 2 moves.',
      difficulty: 'Medium',
      fen: '2c8/3g3h3/4FT5/3t7/11/5C5/11/11/11/11/11/11 r - - 0 1',
      hint: 'Double attack is very powerful if you know how to create them.'
    },
    {
      id: 3,
      title: 'Less vs More',
      description: 'Must win in 3 moves.',
      difficulty: 'Hard',
      fen: '2c1a1f4/11/2t1s1F4/11/2A8/11/11/11/11/11/3C7/11 r - - 0 1',
      hint: 'Last piece from each side auto promoted.'
    },
  ];

  function getDifficultyColor(difficulty: string): string {
    switch (difficulty) {
      case 'Easy': return 'var(--color-success, #22c55e)';
      case 'Medium': return 'var(--color-warning, #eab308)';
      case 'Hard': return 'var(--color-error, #ef4444)';
      default: return 'var(--theme-text-secondary, #aaa)';
    }
  }

  function puzzleUrl(fen: string): string {
    return `/play?fen=${encodeURIComponent(fen)}`;
  }
</script>

<CommandCenter center={centerContent} />

{#snippet centerContent()}
  <div class="puzzles-center">
    <h1 class="section-header">{i18n.t('puzzles.title')}</h1>
    <p class="text-secondary">{i18n.t('puzzles.subtitle')}</p>

    <hr class="divider" />

    <div class="flat-list">
      {#each puzzles as puzzle}
        <div class="puzzle-row">
          <div class="puzzle-info">
            <span class="puzzle-id">#{puzzle.id}</span>
            <span class="puzzle-title">{puzzle.title}</span>
            <span class="puzzle-diff" style="color: {getDifficultyColor(puzzle.difficulty)}">
              {puzzle.difficulty}
            </span>
          </div>
          <a href={puzzleUrl(puzzle.fen)} class="text-link">play</a>
        </div>

        <p class="puzzle-desc">{puzzle.description}</p>

        {#if puzzle.hint}
          <details class="puzzle-hint">
            <summary class="text-link">{i18n.t('puzzles.showHint')}</summary>
            <p class="hint-text">{puzzle.hint}</p>
          </details>
        {/if}
      {/each}
    </div>

    <hr class="divider" />

    <p class="text-secondary">{i18n.t('puzzles.comingSoon')}</p>
    <a href="/board-editor" class="text-link">{i18n.t('puzzles.createOwn')}</a>
  </div>
{/snippet}

<style>
  .puzzles-center {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding-top: 1rem;
  }

  .text-secondary {
    color: var(--theme-text-secondary, #aaa);
    font-size: 0.8125rem;
    margin: 0;
  }

  .puzzle-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.25rem 0;
  }

  .puzzle-info {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .puzzle-id {
    font-family: var(--font-mono, monospace);
    color: var(--theme-text-secondary, #aaa);
    font-size: 0.8125rem;
    min-width: 2ch;
  }

  .puzzle-title {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--theme-text-primary, #eee);
  }

  .puzzle-diff {
    font-family: var(--font-mono, monospace);
    font-size: 0.75rem;
    text-transform: uppercase;
  }

  .puzzle-desc {
    color: var(--theme-text-secondary, #aaa);
    font-size: 0.8125rem;
    margin: 0 0 0.25rem 0;
    padding-left: 2.5ch;
  }

  .puzzle-hint {
    font-size: 0.8125rem;
    padding-left: 2.5ch;
    margin-bottom: 0.5rem;
  }

  .puzzle-hint summary {
    cursor: pointer;
    list-style: none;
  }

  .puzzle-hint summary::-webkit-details-marker {
    display: none;
  }

  .hint-text {
    margin: 0.25rem 0 0 0;
    color: var(--theme-text-secondary, #aaa);
    padding-left: 0.75rem;
    border-left: 2px solid var(--theme-border, #333);
  }
</style>
