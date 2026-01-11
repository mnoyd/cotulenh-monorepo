<script lang="ts">
  import { Puzzle, Play, ChevronRight } from 'lucide-svelte';

  interface PuzzleData {
    id: number;
    title: string;
    description: string;
    difficulty: 'Easy' | 'Medium' | 'Hard';
    fen: string;
    hint?: string;
  }

  const puzzles: PuzzleData[] = [
    {
      id: 1,
      title: 'Commander Capture',
      description: 'Red to move. Find the winning move to capture the blue commander.',
      difficulty: 'Easy',
      fen: '6c4/4fh1hf2/3a2s2a1/2n1gt1tg2/2ie2m2ei/5C5/11/2IE2M2EI/2N1GT1TG2/3A2S2A1/1N2FH1HF2/11',
      hint: 'Look for a direct attack on the commander.'
    },
    {
      id: 2,
      title: 'Air Force Strike',
      description: 'Use the air force to break through enemy lines.',
      difficulty: 'Medium',
      fen: '6c4/1n2fh1hf2/3a2s2a1/2n1gt1tg2/4e1m2ei/5F5/11/2IE2M2EI/2N1GT1TG2/3A2S2A1/1N2FH1HF2/6C4',
      hint: 'Air force can fly over pieces but watch out for air defense.'
    },
    {
      id: 3,
      title: 'Tank Assault',
      description: 'Position your tanks to dominate the center.',
      difficulty: 'Medium',
      fen: '6c4/1n2fh1hf2/3a2s2a1/4gt1tg2/2ie2m2ei/2T3T4/11/2IE2M2EI/2N1GT1TG2/3A2S2A1/1N2FH1HF2/6C4',
      hint: 'Tanks are powerful in open terrain.'
    },
    {
      id: 4,
      title: 'Naval Blockade',
      description: 'Use your navy to control the water zones.',
      difficulty: 'Hard',
      fen: '6c4/1n2fh1hf2/3a2s2a1/2n1gt1tg2/2ie2m2ei/11/11/2IE2M2EI/2N1GT1TG2/3A1NS2A1/4FH1HF2/6C4',
      hint: 'Navy pieces have special movement on water terrain.'
    },
    {
      id: 5,
      title: 'Combined Arms',
      description: 'Coordinate multiple unit types for a decisive attack.',
      difficulty: 'Hard',
      fen: '6c4/1n2fh1hf2/3a2s2a1/4gt1tg2/4e1m2ei/3TFN4/11/2IE2M2EI/2N1GT1TG2/3A2S2A1/1N2FH1HF2/6C4',
      hint: 'Different pieces work together to overcome defenses.'
    }
  ];

  function getDifficultyColor(difficulty: string): string {
    switch (difficulty) {
      case 'Easy':
        return 'difficulty-easy';
      case 'Medium':
        return 'difficulty-medium';
      case 'Hard':
        return 'difficulty-hard';
      default:
        return '';
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
      <h1>Puzzles</h1>
      <p class="subtitle">Practice your tactical skills with these positions</p>
    </header>

    <div class="puzzles-grid">
      {#each puzzles as puzzle}
        <article class="puzzle-card">
          <div class="puzzle-header">
            <span class="puzzle-number">#{puzzle.id}</span>
            <span class="puzzle-difficulty {getDifficultyColor(puzzle.difficulty)}">
              {puzzle.difficulty}
            </span>
          </div>

          <h2 class="puzzle-title">{puzzle.title}</h2>
          <p class="puzzle-description">{puzzle.description}</p>

          {#if puzzle.hint}
            <details class="puzzle-hint">
              <summary>Show hint</summary>
              <p>{puzzle.hint}</p>
            </details>
          {/if}

          <a href={getPlayUrl(puzzle.fen)} class="play-button">
            <Play size={18} />
            <span>Play</span>
            <ChevronRight size={18} />
          </a>
        </article>
      {/each}
    </div>

    <div class="puzzles-footer">
      <p>More puzzles coming soon!</p>
      <a href="/board-editor" class="create-link">Create your own puzzle →</a>
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
