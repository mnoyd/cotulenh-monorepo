<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { ArrowLeft, RotateCcw, ArrowRight, Star, CheckCircle, HelpCircle } from 'lucide-svelte';
  import BoardContainer from '$lib/components/BoardContainer.svelte';
  import TargetMarker from './TargetMarker.svelte';
  import { LearnSession } from '../learn-session.svelte';
  import { getI18n } from '$lib/i18n/index.svelte';
  import '$lib/styles/board.css';

  const i18n = getI18n();

  type Props = {
    lessonId: string;
    nextUrl?: string;
    backUrl?: string;
  };

  let { lessonId, nextUrl, backUrl = '/learn' }: Props = $props();

  let session = $state<LearnSession | null>(null);

  onMount(() => {
    session = new LearnSession(lessonId);
  });

  $effect(() => {
    if (session) {
      session.setupBoardEffect();
    }
  });

  function handleNext() {
    if (nextUrl) {
      goto(nextUrl);
    } else {
      goto('/learn');
    }
  }

  function handleHint() {
    session?.showHint();
  }

  // Get target squares that should be shown (only remaining unvisited targets)
  const visibleTargets = $derived.by(() => {
    if (!session || session.status !== 'ready') {
      return [];
    }
    return session.remainingTargets;
  });
</script>

{#if session && session.lesson}
  <div class="lesson-player">
    <header class="lesson-header">
      <a href={backUrl} class="back-button">
        <ArrowLeft size={20} />
        <span>{i18n.t('learn.backToLessons')}</span>
      </a>
      <h1>{session.lesson.title}</h1>
    </header>

    <div class="lesson-content">
      <div class="board-section">
        <BoardContainer
          config={session.boardConfig}
          onApiReady={(api) => session?.setBoardApi(api)}
        />
        <!-- Target markers are injected into board DOM -->
        {#each visibleTargets as targetSquare (targetSquare)}
          <TargetMarker square={targetSquare} boardApi={session.boardApi} />
        {/each}
      </div>

      <div class="instruction-section">
        {#if session.status === 'completed'}
          <div class="completion-panel">
            <CheckCircle size={48} class="completion-icon" />
            <h2>{i18n.t('learn.lessonComplete')}</h2>
            <div class="stars-earned">
              {#each [1, 2, 3] as i}
                <Star
                  size={32}
                  fill={i <= session.stars ? '#fbbf24' : 'none'}
                  color={i <= session.stars ? '#fbbf24' : '#666'}
                />
              {/each}
            </div>
            <p class="move-count">Moves: {session.moveCount}</p>
            {#if session.showFeedback}
              <p class="success-message">{session.feedbackMessage}</p>
            {/if}
            <div class="completion-actions">
              <button class="btn secondary" onclick={() => session?.restart()}>
                <RotateCcw size={16} />
                {i18n.t('common.tryAgain')}
              </button>
              <button class="btn primary" onclick={handleNext}>
                <ArrowRight size={16} />
                {i18n.t('common.continue')}
              </button>
            </div>
          </div>
        {:else}
          <div class="instruction-panel">
            <p class="instruction-text">{session.instruction}</p>

            <div class="lesson-controls">
              <button class="btn hint-btn" onclick={handleHint} disabled={!session.hint}>
                <HelpCircle size={16} />
                Hint
              </button>
              <button class="btn secondary" onclick={() => session?.restart()}>
                <RotateCcw size={16} />
                Reset
              </button>
            </div>

            <div class="move-counter">Moves: {session.moveCount}</div>

            {#if session.showFeedback}
              <div class="feedback hint">
                {session.feedbackMessage}
              </div>
            {/if}
          </div>
        {/if}
      </div>
    </div>
  </div>
{:else}
  <div class="loading">{i18n.t('learn.loadingLesson')}</div>
{/if}

<style>
  .lesson-player {
    min-height: 100vh;
    background: var(--theme-bg-dark, #000);
    color: var(--theme-text-primary, #eee);
    padding: 1rem;
  }

  .lesson-header {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid var(--theme-border, #444);
  }

  .back-button {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--theme-text-secondary, #aaa);
    text-decoration: none;
    padding: 0.5rem;
    border-radius: 4px;
  }

  .back-button:hover {
    background: var(--theme-bg-elevated, #333);
    color: var(--theme-text-primary, #eee);
  }

  .lesson-header h1 {
    margin: 0;
    font-size: 1.5rem;
  }

  .lesson-content {
    display: flex;
    gap: 1.5rem;
    max-width: 1200px;
    margin: 0 auto;
  }

  .board-section {
    flex: none;
    width: min(500px, 50vw);
    border: 1px solid var(--theme-border, #444);
    background: var(--theme-bg-base, #222);
    padding: 0.25rem;
  }

  .instruction-section {
    flex: 1;
    min-width: 300px;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .instruction-panel {
    background: var(--theme-bg-panel, #222);
    border: 1px solid var(--theme-border, #444);
    border-radius: 8px;
    padding: 1.5rem;
  }

  .instruction-text {
    font-size: 1.125rem;
    line-height: 1.6;
    margin: 0 0 1rem 0;
  }

  .lesson-controls {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }

  .move-counter {
    font-size: 0.875rem;
    color: var(--theme-text-secondary, #aaa);
    margin-bottom: 0.5rem;
  }

  .move-count {
    color: var(--theme-text-secondary, #aaa);
    margin: 0.5rem 0;
  }

  .success-message {
    color: var(--theme-success, #22c55e);
    font-weight: 500;
    margin: 0.5rem 0;
  }

  .feedback {
    margin-top: 1rem;
    padding: 0.75rem 1rem;
    border-radius: 6px;
    font-weight: 500;
  }

  .feedback.hint {
    background: rgba(59, 130, 246, 0.2);
    color: #3b82f6;
    border: 1px solid #3b82f6;
  }

  .completion-panel {
    background: var(--theme-bg-panel, #222);
    border: 1px solid var(--theme-success, #22c55e);
    border-radius: 12px;
    padding: 2rem;
    text-align: center;
  }

  .completion-panel :global(.completion-icon) {
    color: var(--theme-success, #22c55e);
  }

  .completion-panel h2 {
    margin: 1rem 0;
    color: var(--theme-success, #22c55e);
  }

  .stars-earned {
    display: flex;
    justify-content: center;
    gap: 0.5rem;
    margin: 1rem 0;
  }

  .completion-actions {
    display: flex;
    gap: 1rem;
    justify-content: center;
    margin-top: 1.5rem;
  }

  .btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: 6px;
    font-weight: 600;
    cursor: pointer;
    font-size: 0.875rem;
  }

  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn.primary {
    background: var(--theme-success, #22c55e);
    color: #000;
  }

  .btn.secondary {
    background: transparent;
    border: 1px solid var(--theme-border, #444);
    color: var(--theme-text-primary, #eee);
  }

  .btn.hint-btn {
    background: rgba(59, 130, 246, 0.2);
    border: 1px solid #3b82f6;
    color: #3b82f6;
  }

  .loading {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    color: var(--theme-text-secondary, #aaa);
  }

  @media (max-width: 768px) {
    .lesson-content {
      flex-direction: column;
    }

    .board-section {
      width: 100%;
    }
  }
</style>
