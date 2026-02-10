<script lang="ts">
  import { goto } from '$app/navigation';
  import { fly, fade, slide } from 'svelte/transition';
  import {
    RotateCcw,
    ArrowRight,
    ArrowLeft as ArrowLeftIcon,
    Star,
    CheckCircle,
    HelpCircle
  } from 'lucide-svelte';
  import BoardContainer from '$lib/components/BoardContainer.svelte';
  import TargetMarker from './TargetMarker.svelte';
  import SquareTooltip from './SquareTooltip.svelte';
  import HintVisuals from './HintVisuals.svelte';
  import LessonContent from './LessonContent.svelte';
  import LessonStepper from './LessonStepper.svelte';
  import LessonIntroModal from './LessonIntroModal.svelte';
  import Celebration from './Celebration.svelte';
  import { LearnSession } from '../learn-session.svelte';
  import { getI18n } from '$lib/i18n/index.svelte';
  import { getLessonContext } from '@cotulenh/learn';
  import { getStoredValue, setStoredValue } from '$lib/stores/persisted.svelte';
  import '$lib/styles/board.css';

  const i18n = getI18n();

  type Props = {
    lessonId: string;
    nextUrl?: string;
  };

  let { lessonId, nextUrl }: Props = $props();

  let session = $state<LearnSession | null>(null);
  let showIntroModal = $state(false);

  // Get lesson context for navigation
  const lessonContext = $derived(getLessonContext(lessonId));
  const prevUrl = $derived.by(() => {
    if (!lessonContext?.prevLesson) return null;
    const prev = lessonContext.prevLesson;
    return `/learn/${prev.subjectId}/${prev.sectionId}/${prev.id}`;
  });

  // Check if user has seen this lesson's intro before
  function hasSeenIntro(id: string): boolean {
    const seen = getStoredValue<string[]>('learn-seen-intros', []);
    return seen.includes(id);
  }

  function markIntroSeen(id: string): void {
    const seen = getStoredValue<string[]>('learn-seen-intros', []);
    if (!seen.includes(id)) {
      setStoredValue('learn-seen-intros', [...seen, id]);
    }
  }

  // Recreate session when lessonId changes (not just on mount)
  $effect(() => {
    const newSession = new LearnSession(lessonId);
    session = newSession;

    // Show intro modal for first-time visitors if lesson has content
    if ((newSession.translatedLesson?.content ?? newSession.lesson?.content) && !hasSeenIntro(lessonId)) {
      showIntroModal = true;
    } else {
      showIntroModal = false;
    }

    return () => {
      newSession.dispose();
    };
  });

  $effect(() => {
    if (session) {
      session.setupBoardEffect();
    }
  });

  function handleStartLesson() {
    markIntroSeen(lessonId);
    showIntroModal = false;
  }

  function handleNext() {
    goto(nextUrl ?? '/learn');
  }

  function handlePrev() {
    if (prevUrl) goto(prevUrl);
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

  const introLesson = $derived.by(() => {
    if (!session) return null;
    return session.translatedLesson ?? session.lesson;
  });
</script>

{#if session && session.lesson}
  <!-- Intro modal for first-time visitors -->
  {#if showIntroModal && introLesson}
    <LessonIntroModal lesson={introLesson} onStart={handleStartLesson} />
  {/if}

  {#if session.status === 'completed'}
    <Celebration />
  {/if}

  <div class="lesson-player">
    <!-- Progress stepper with breadcrumb navigation -->
    <LessonStepper {lessonId} />

    <header class="lesson-header">
      <div class="nav-controls">
        {#if prevUrl}
          <button
            class="nav-btn"
            onclick={handlePrev}
            title={i18n.t('learn.previousLesson')}
            aria-label={i18n.t('learn.previousLesson')}
          >
            <ArrowLeftIcon size={18} />
          </button>
        {/if}
      </div>
      <h1>{session.lessonTitle}</h1>
      <div class="nav-controls">
        {#if nextUrl && session.status !== 'completed'}
          <button
            class="nav-btn"
            onclick={handleNext}
            title={i18n.t('learn.skipToNext')}
            aria-label={i18n.t('learn.skipToNext')}
          >
            <ArrowRight size={18} />
          </button>
        {/if}
      </div>
    </header>

    <div class="lesson-content">
      <div class="board-section">
        {#key lessonId}
          <BoardContainer
            config={session.boardConfig}
            onApiReady={(api) => session?.setBoardApi(api)}
          />
          <!-- Target markers are injected into board DOM -->
          {#each visibleTargets as targetSquare (targetSquare)}
            <TargetMarker square={targetSquare} boardApi={session.boardApi} />
          {/each}
          <!-- Tooltip overlay for hover hints -->
          <SquareTooltip {session} boardApi={session.boardApi} />
          <!-- Progressive hint visuals -->
          <HintVisuals {session} />
        {/key}
      </div>

      <div class="instruction-section">
        {#if session.status === 'completed'}
          <div class="completion-panel" in:fly={{ y: 20, duration: 500, delay: 200 }}>
            <div class="completion-icon-wrapper" in:fly={{ y: 20, duration: 400, delay: 400 }}>
              <CheckCircle size={56} class="completion-icon" />
            </div>

            <h2 in:fade={{ duration: 400, delay: 500 }}>
              {i18n.t('learn.lessonComplete')}
            </h2>

            {#if session.gradingSystem === 'stars'}
              <div class="stars-earned">
                {#each [1, 2, 3] as i}
                  <div class="star-wrapper" in:fly={{ y: 20, duration: 400, delay: 600 + i * 150 }}>
                    <Star
                      size={36}
                      fill={i <= session.stars ? '#fbbf24' : 'none'}
                      color={i <= session.stars ? '#fbbf24' : '#4b5563'}
                      strokeWidth={1.5}
                    />
                  </div>
                {/each}
              </div>
              <p class="move-count" in:fade={{ duration: 400, delay: 1100 }}>
                {i18n.t('learn.moves')}: {session.moveCount}
              </p>
            {/if}

            {#if session.showFeedback}
              <p class="success-message" in:fade={{ duration: 400, delay: 600 }}>
                {session.feedbackMessage}
              </p>
            {/if}

            <div class="completion-actions" in:fade={{ duration: 400, delay: 1200 }}>
              <button class="btn secondary" onclick={() => session?.restart()}>
                <RotateCcw size={16} />
                {i18n.t('common.tryAgain')}
              </button>
              <button class="btn primary" onclick={() => handleNext()}>
                <ArrowRight size={16} />
                {i18n.t('common.continue')}
              </button>
            </div>
          </div>
        {:else}
          <div class="instruction-panel" transition:fade={{ duration: 200 }}>
            {#if session.lessonContent}
              <LessonContent content={session.lessonContent} />
            {/if}
            <p class="instruction-text">{session.instruction}</p>

            <div class="lesson-controls">
              <button class="btn hint-btn" onclick={handleHint} disabled={!session.hint}>
                <HelpCircle size={16} />
                {i18n.t('learn.hint')}
              </button>
              <button class="btn secondary" onclick={() => session?.restart()}>
                <RotateCcw size={16} />
                {i18n.t('learn.reset')}
              </button>
            </div>

            {#if session.gradingSystem === 'stars'}
              <div class="move-counter">{i18n.t('learn.moves')}: {session.moveCount}</div>
            {/if}

            {#if session.showFeedback}
              {#key session.feedbackMessage}
                <div class="feedback hint" transition:slide={{ duration: 200 }}>
                  <span class="feedback-text animate-pulse">
                    {session.feedbackMessage}
                  </span>
                </div>
              {/key}
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
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 1rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid var(--theme-border, #444);
  }

  .nav-controls {
    display: flex;
    align-items: center;
    min-width: 40px;
  }

  .nav-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    background: transparent;
    border: 1px solid var(--theme-border, #444);
    border-radius: 6px;
    color: var(--theme-text-secondary, #aaa);
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .nav-btn:hover {
    background: var(--theme-bg-elevated, #333);
    color: var(--theme-text-primary, #eee);
    border-color: var(--theme-primary, #3b82f6);
  }

  .lesson-header h1 {
    margin: 0;
    font-size: 1.5rem;
    text-align: center;
    flex: 1;
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
    position: relative; /* For transitions */
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
    padding: 2.5rem;
    text-align: center;
    box-shadow: 0 10px 30px -5px rgba(34, 197, 94, 0.2);
  }

  .completion-icon-wrapper {
    margin-bottom: 1rem;
  }

  .completion-panel :global(.completion-icon) {
    color: var(--theme-success, #22c55e);
    filter: drop-shadow(0 0 10px rgba(34, 197, 94, 0.5));
  }

  .completion-panel h2 {
    margin: 0.5rem 0 1.5rem;
    color: var(--theme-success, #22c55e);
    font-size: 1.75rem;
    font-weight: 700;
  }

  .stars-earned {
    display: flex;
    justify-content: center;
    gap: 0.75rem;
    margin: 1.5rem 0 0.5rem;
  }

  .star-wrapper {
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
  }

  .completion-actions {
    display: flex;
    gap: 1rem;
    justify-content: center;
    margin-top: 2rem;
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
    transition: all 0.2s ease;
  }

  .btn:hover {
    transform: translateY(-1px);
  }

  .btn:active {
    transform: translateY(0);
  }

  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn.primary {
    background: var(--theme-success, #22c55e);
    color: #000;
  }

  .btn.primary:hover {
    background: #16a34a;
    box-shadow: 0 4px 12px rgba(34, 197, 94, 0.4);
  }

  .btn.secondary {
    background: transparent;
    border: 1px solid var(--theme-border, #444);
    color: var(--theme-text-primary, #eee);
  }

  .btn.secondary:hover {
    border-color: var(--theme-text-secondary, #aaa);
    background: rgba(255, 255, 255, 0.05);
  }

  .btn.hint-btn {
    background: rgba(59, 130, 246, 0.2);
    border: 1px solid #3b82f6;
    color: #3b82f6;
  }

  .btn.hint-btn:hover {
    background: rgba(59, 130, 246, 0.3);
    box-shadow: 0 0 10px rgba(59, 130, 246, 0.3);
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

    .instruction-section {
      min-width: 0;
    }
  }

  @keyframes pulse {
    0% {
      opacity: 0.6;
      transform: scale(0.98);
    }
    50% {
      opacity: 1;
      transform: scale(1.01);
    }
    100% {
      opacity: 1;
      transform: scale(1);
    }
  }

  .animate-pulse {
    display: block;
    animation: pulse 0.3s ease-out;
  }
</style>
