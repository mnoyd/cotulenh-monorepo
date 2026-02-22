<script lang="ts">
  import type { LearnSession } from '../learn-session.svelte';
  import LessonContent from './LessonContent.svelte';
  import { getI18n } from '$lib/i18n/index.svelte';

  interface Props {
    session: LearnSession;
    mode: 'guided' | 'practice';
  }

  let { session, mode }: Props = $props();
  const i18n = getI18n();

  const lesson = $derived(session.translatedLesson ?? session.lesson);

  const successCriteria = $derived.by(() => {
    if (!lesson) return i18n.t('learn.criteriaDefault');
    if (lesson.targetSquares?.length) {
      return i18n.t('learn.criteriaVisitTargets').replace('{completed}', String(session.completedTargets)).replace('{total}', String(session.totalTargets));
    }
    if (lesson.scenario?.length) {
      return i18n.t('learn.criteriaFollowScenario');
    }
    if (lesson.goalFen) {
      return i18n.t('learn.criteriaReachGoal');
    }
    return i18n.t('learn.criteriaDefault');
  });

  const constraints = $derived.by(() => {
    if (!lesson) return [] as string[];
    const list: string[] = [];
    if (lesson.validateTerrain) list.push(i18n.t('learn.constraintTerrain'));
    if (lesson.strictScenario) list.push(i18n.t('learn.constraintScenario'));
    if (lesson.validateLegality) list.push(i18n.t('learn.constraintLegal'));
    if (lesson.orderedTargets) list.push(i18n.t('learn.constraintOrdered'));
    if (!list.length) list.push(i18n.t('learn.constraintDefault'));
    return list;
  });
</script>

<section class="objective-card hud-corners">
  <header>
    <span class="label">{i18n.t('learn.tabObjective')}</span>
    <span class="mode-badge {mode}">{mode === 'guided' ? i18n.t('learn.modeGuided') : i18n.t('learn.modePractice')}</span>
  </header>

  <p class="instruction">{session.instruction}</p>

  <div class="block">
    <h3>{i18n.t('learn.successCriteria')}</h3>
    <p>{successCriteria}</p>
  </div>

  <div class="block">
    <h3>{i18n.t('learn.constraints')}</h3>
    <ul>
      {#each constraints as item}
        <li>{item}</li>
      {/each}
    </ul>
  </div>

  {#if session.lessonContent}
    <details class="brief">
      <summary>{i18n.t('learn.readBrief')}</summary>
      <div class="brief-content">
        <LessonContent content={session.lessonContent} />
      </div>
    </details>
  {/if}
</section>

<style>
  .objective-card {
    background: var(--theme-bg-panel, #111827);
    border: 1px solid var(--theme-border, rgba(59, 130, 246, 0.35));
    border-radius: 8px;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.8rem;
  }

  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.75rem;
  }

  .label {
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--theme-text-secondary, #9ca3af);
    font-family: var(--font-mono, monospace);
  }

  .mode-badge {
    padding: 0.2rem 0.5rem;
    border-radius: 999px;
    font-size: 0.68rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    border: 1px solid;
    font-family: var(--font-mono, monospace);
  }

  .mode-badge.guided {
    color: #60a5fa;
    background: rgba(59, 130, 246, 0.15);
    border-color: rgba(59, 130, 246, 0.45);
  }

  .mode-badge.practice {
    color: #f59e0b;
    background: rgba(245, 158, 11, 0.14);
    border-color: rgba(245, 158, 11, 0.45);
  }

  .instruction {
    margin: 0;
    font-size: 1rem;
    line-height: 1.55;
    color: var(--theme-text-primary, #f3f4f6);
  }

  .block h3 {
    margin: 0 0 0.25rem;
    font-size: 0.74rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--theme-primary, #60a5fa);
    font-family: var(--font-mono, monospace);
  }

  .block p {
    margin: 0;
    color: var(--theme-text-secondary, #d1d5db);
    font-size: 0.9rem;
  }

  .block ul {
    margin: 0;
    padding-left: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    color: var(--theme-text-secondary, #d1d5db);
    font-size: 0.88rem;
  }

  .brief {
    border-top: 1px solid var(--theme-border-subtle, rgba(59, 130, 246, 0.2));
    padding-top: 0.75rem;
  }

  .brief summary {
    cursor: pointer;
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--theme-secondary, #10b981);
  }

  .brief-content {
    margin-top: 0.6rem;
    max-height: 220px;
    overflow: auto;
    padding-right: 0.25rem;
  }
</style>
