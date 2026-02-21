<script lang="ts">
  import { goto } from '$app/navigation';
  import { fade } from 'svelte/transition';
  import { ArrowRight, ArrowLeft as ArrowLeftIcon } from 'lucide-svelte';
  import BoardContainer from '$lib/components/BoardContainer.svelte';
  import TargetMarker from './TargetMarker.svelte';
  import SquareTooltip from './SquareTooltip.svelte';
  import HintVisuals from './HintVisuals.svelte';
  import LessonStepper from './LessonStepper.svelte';
  import LessonIntroModal from './LessonIntroModal.svelte';
  import Celebration from './Celebration.svelte';
  import LessonObjectiveCard from './LessonObjectiveCard.svelte';
  import LessonAttemptPanel from './LessonAttemptPanel.svelte';
  import LessonAttemptLog from './LessonAttemptLog.svelte';
  import LessonCompletionCard from './LessonCompletionCard.svelte';
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

  type LearnMode = 'guided' | 'practice';
  type MobilePanel = 'objective' | 'assist' | 'log';

  let { lessonId, nextUrl }: Props = $props();

  let session = $state<LearnSession | null>(null);
  let showIntroModal = $state(false);
  let mode = $state<LearnMode>(getStoredValue<LearnMode>('learn-player-mode', 'guided'));
  let mobilePanel = $state<MobilePanel>('objective');

  const lessonContext = $derived(getLessonContext(lessonId));
  const prevUrl = $derived.by(() => {
    if (!lessonContext?.prevLesson) return null;
    const prev = lessonContext.prevLesson;
    return `/learn/${prev.subjectId}/${prev.sectionId}/${prev.id}`;
  });

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

  function setMode(nextMode: LearnMode): void {
    mode = nextMode;
    setStoredValue('learn-player-mode', nextMode);
  }

  $effect(() => {
    const newSession = new LearnSession(lessonId);
    session = newSession;

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

  $effect(() => {
    if (session) {
      session.setAssistanceMode(mode);
    }
  });

  $effect(() => {
    if (session?.status === 'completed' && mobilePanel === 'objective') {
      mobilePanel = 'assist';
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
    if (!session) return;
    session.showHint(mode === 'guided' ? LearnSession.HINT_AUTO_HIDE_DURATION : 0);
  }
</script>

{#if session && session.lesson}
  {#if showIntroModal && introLesson}
    <LessonIntroModal lesson={introLesson} onStart={handleStartLesson} />
  {/if}

  {#if session.status === 'completed'}
    <Celebration />
  {/if}

  <div class="lesson-player">
    <LessonStepper {lessonId} />

    <header class="mission-header">
      <div class="left-actions">
        {#if prevUrl}
          <button
            class="nav-btn"
            onclick={handlePrev}
            title={i18n.t('learn.previousLesson')}
            aria-label={i18n.t('learn.previousLesson')}
          >
            <ArrowLeftIcon size={17} />
          </button>
        {/if}
        <h1>{session.lessonTitle}</h1>
      </div>

      <div class="right-actions">
        <div class="mode-toggle" role="tablist" aria-label="Learning mode">
          <button class:active={mode === 'guided'} onclick={() => setMode('guided')}>Guided</button>
          <button class:active={mode === 'practice'} onclick={() => setMode('practice')}>Practice</button>
        </div>

        {#if nextUrl && session.status !== 'completed'}
          <button
            class="nav-btn"
            onclick={handleNext}
            title={i18n.t('learn.skipToNext')}
            aria-label={i18n.t('learn.skipToNext')}
          >
            <ArrowRight size={17} />
          </button>
        {/if}
      </div>
    </header>

    <div class="mission-layout">
      <section class="board-zone">
        {#key lessonId}
          <BoardContainer config={session.boardConfig} onApiReady={(api) => session?.setBoardApi(api)} />
          {#each visibleTargets as targetSquare (targetSquare)}
            <TargetMarker square={targetSquare} boardApi={session.boardApi} />
          {/each}
          <SquareTooltip {session} boardApi={session.boardApi} />
          {#if mode === 'guided'}
            <HintVisuals {session} />
          {/if}
        {/key}
      </section>

      <aside class="mission-side desktop-side">
        <LessonObjectiveCard {session} {mode} />
        <LessonAttemptPanel {session} {mode} onHint={handleHint} onReset={() => session?.restart()} />

        {#if session.status === 'completed'}
          <div transition:fade={{ duration: 180 }}>
            <LessonCompletionCard {session} onRestart={() => session?.restart()} onContinue={handleNext} />
          </div>
        {/if}
      </aside>
    </div>

    <div class="desktop-log">
      <LessonAttemptLog {session} />
    </div>

    <section class="mobile-dock">
      <div class="mobile-tabs" role="tablist" aria-label="Lesson panels">
        <button
          role="tab"
          aria-selected={mobilePanel === 'objective'}
          class:active={mobilePanel === 'objective'}
          onclick={() => (mobilePanel = 'objective')}
        >
          Objective
        </button>
        <button
          role="tab"
          aria-selected={mobilePanel === 'assist'}
          class:active={mobilePanel === 'assist'}
          onclick={() => (mobilePanel = 'assist')}
        >
          Hints
        </button>
        <button
          role="tab"
          aria-selected={mobilePanel === 'log'}
          class:active={mobilePanel === 'log'}
          onclick={() => (mobilePanel = 'log')}
        >
          Log
        </button>
      </div>

      <div class="mobile-panel">
        {#if mobilePanel === 'objective'}
          <LessonObjectiveCard {session} {mode} />
        {:else if mobilePanel === 'assist'}
          <LessonAttemptPanel {session} {mode} onHint={handleHint} onReset={() => session?.restart()} />
        {:else}
          <LessonAttemptLog {session} />
        {/if}
      </div>

      {#if session.status === 'completed'}
        <LessonCompletionCard {session} onRestart={() => session?.restart()} onContinue={handleNext} />
      {/if}
    </section>
  </div>
{:else}
  <div class="loading">{i18n.t('learn.loadingLesson')}</div>
{/if}

<style>
  .lesson-player {
    min-height: 100vh;
    background: radial-gradient(circle at 20% 10%, rgba(34, 197, 94, 0.08), transparent 40%),
      radial-gradient(circle at 95% 20%, rgba(59, 130, 246, 0.12), transparent 45%),
      var(--theme-bg-dark, #020617);
    color: var(--theme-text-primary, #e2e8f0);
    padding: 1rem;
  }

  .mission-header {
    margin-top: 1rem;
    margin-bottom: 1rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    border-bottom: 1px solid var(--theme-border, rgba(59, 130, 246, 0.3));
    padding-bottom: 0.8rem;
  }

  .left-actions,
  .right-actions {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  h1 {
    margin: 0;
    font-size: 1.25rem;
    color: var(--theme-text-primary, #f8fafc);
  }

  .mode-toggle {
    display: inline-flex;
    border: 1px solid var(--theme-border, rgba(59, 130, 246, 0.35));
    border-radius: 999px;
    overflow: hidden;
    background: rgba(15, 23, 42, 0.65);
  }

  .mode-toggle button {
    border: 0;
    background: transparent;
    color: var(--theme-text-secondary, #94a3b8);
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-family: var(--font-mono, monospace);
    cursor: pointer;
    padding: 0.35rem 0.7rem;
  }

  .mode-toggle button.active {
    color: #e2e8f0;
    background: rgba(59, 130, 246, 0.25);
  }

  .nav-btn {
    width: 36px;
    height: 36px;
    border-radius: 8px;
    border: 1px solid var(--theme-border, rgba(59, 130, 246, 0.4));
    background: rgba(15, 23, 42, 0.8);
    color: var(--theme-text-secondary, #cbd5e1);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
  }

  .mission-layout {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 340px;
    gap: 1rem;
    align-items: start;
  }

  .board-zone {
    border: 1px solid var(--theme-border, rgba(59, 130, 246, 0.35));
    background: var(--theme-bg-base, #0f172a);
    padding: 0.25rem;
  }

  .mission-side {
    display: flex;
    flex-direction: column;
    gap: 0.85rem;
  }

  .desktop-log {
    display: block;
    margin-top: 1rem;
  }

  .mobile-dock {
    display: none;
  }

  .loading {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--theme-text-secondary, #94a3b8);
  }

  @media (max-width: 1100px) {
    .mission-layout {
      grid-template-columns: minmax(0, 1fr);
    }
  }

  @media (max-width: 760px) {
    .lesson-player {
      padding: 0.75rem;
    }

    .mission-header {
      flex-direction: column;
      align-items: stretch;
      gap: 0.6rem;
    }

    .left-actions,
    .right-actions {
      justify-content: space-between;
    }

    h1 {
      font-size: 1rem;
    }

    .desktop-side,
    .desktop-log {
      display: none;
    }

    .mobile-dock {
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
      margin-top: 0.75rem;
      padding-bottom: max(0.5rem, env(safe-area-inset-bottom));
    }

    .mobile-tabs {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 0.35rem;
      border: 1px solid rgba(59, 130, 246, 0.35);
      border-radius: 10px;
      padding: 0.3rem;
      background: rgba(15, 23, 42, 0.8);
    }

    .mobile-tabs button {
      border: 0;
      border-radius: 7px;
      padding: 0.45rem 0.35rem;
      background: transparent;
      color: #94a3b8;
      font-size: 0.67rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      font-family: var(--font-mono, monospace);
    }

    .mobile-tabs button.active {
      background: rgba(59, 130, 246, 0.22);
      color: #e2e8f0;
    }

    .mobile-panel {
      min-height: 200px;
    }
  }
</style>
