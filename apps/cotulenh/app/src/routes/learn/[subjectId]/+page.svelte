<script lang="ts">
  import { page } from '$app/stores';
  import { getSubjectById, translateSubject, translateSection, tLessonTitle } from '@cotulenh/learn';
  import SubjectIntro from '$lib/learn/components/SubjectIntro.svelte';
  import SectionCard from '$lib/learn/components/SectionCard.svelte';
  import { subjectProgress } from '$lib/learn/learn-progress.svelte';
  import { ArrowLeft, Play, RotateCcw, CheckCircle2, Lock } from 'lucide-svelte';
  import { getI18n } from '$lib/i18n/index.svelte';

  const i18n = getI18n();
  const subjectId = $derived($page.params.subjectId ?? '');
  const subject = $derived(subjectId ? getSubjectById(subjectId) : null);
  const nextLessonInfo = $derived(subjectId ? subjectProgress.getNextIncompleteLesson(subjectId) : null);
  const progress = $derived(subjectId ? subjectProgress.getSubjectProgress(subjectId) : null);

  const locale = $derived(i18n.getLocale() as 'en' | 'vi');
  const translatedSubject = $derived(subject ? translateSubject(subject, locale) : null);
  const nextLessonTitle = $derived(
    nextLessonInfo
      ? tLessonTitle(subjectId, nextLessonInfo.lessonId, nextLessonInfo.title, locale)
      : null
  );
  const progressPercentLabel = $derived(
    i18n.t('learn.progressPercent').replace('{percent}', String(progress?.progress ?? 0))
  );

  function sectionCompleted(sectionIndex: number): boolean {
    const section = subject?.sections[sectionIndex];
    if (!section) return false;
    return section.lessons.every((lesson) => subjectProgress.isLessonCompleted(lesson.id));
  }

  function sectionState(sectionIndex: number): 'completed' | 'active' | 'upcoming' {
    if (sectionCompleted(sectionIndex)) return 'completed';
    const allPreviousCompleted = Array.from({ length: sectionIndex }).every((_, i) => sectionCompleted(i));
    return allPreviousCompleted ? 'active' : 'upcoming';
  }

  function sectionProgress(sectionIndex: number): { done: number; total: number } {
    const section = subject?.sections[sectionIndex];
    if (!section) return { done: 0, total: 0 };
    const done = section.lessons.filter((lesson) => subjectProgress.isLessonCompleted(lesson.id)).length;
    return { done, total: section.lessons.length };
  }

  function sectionActionLink(sectionIndex: number): string {
    const section = subject?.sections[sectionIndex];
    if (!section || !subjectId) return '/learn';
    const next = section.lessons.find((lesson) => !subjectProgress.isLessonCompleted(lesson.id)) ?? section.lessons[0];
    return `/learn/${subjectId}/${section.id}/${next.id}`;
  }

  function sectionActionLabel(sectionIndex: number): string {
    const state = sectionState(sectionIndex);
    if (state === 'completed') return 'Review';
    if (state === 'active') {
      const { done } = sectionProgress(sectionIndex);
      return done > 0 ? 'Continue' : 'Start';
    }
    return 'Locked';
  }
</script>

<div class="subject-page">
  {#if subject}
    <header>
      <a href="/learn" class="back-link">
        <ArrowLeft size={20} />
        {i18n.t('learn.backToSubjects')}
      </a>
      <div class="title-row">
        <span class="icon">{subject.icon}</span>
        <div class="title-text">
          <h1>{translatedSubject?.title}</h1>
          <p class="subtitle">{translatedSubject?.description}</p>
        </div>
      </div>
    </header>

    {#if nextLessonInfo}
      <a
        href="/learn/{subjectId}/{nextLessonInfo.sectionId}/{nextLessonInfo.lessonId}"
        class="continue-cta hud-corners"
      >
        <div class="cta-content">
          <Play size={24} />
          <div class="cta-text">
            <span class="cta-label">{i18n.t('learn.continue')}</span>
            <span class="cta-lesson">{nextLessonTitle}</span>
          </div>
        </div>
        <span class="cta-progress">{progressPercentLabel}</span>
      </a>
    {:else if progress?.completed}
      <div class="completed-banner hud-corners">
        <div class="cta-content">
          <RotateCcw size={24} />
          <div class="cta-text">
            <span class="cta-label">{i18n.t('learn.subjectCompleted')}</span>
            <span class="cta-lesson">{i18n.t('learn.reviewLessons')}</span>
          </div>
        </div>
      </div>
    {/if}

    <section class="timeline hud-corners">
      <h2>
        <span class="label">Mission Timeline</span>
        <span class="line"></span>
      </h2>

      <div class="timeline-items">
        {#each subject.sections as section, index}
          {@const state = sectionState(index)}
          {@const progressInfo = sectionProgress(index)}
          {@const translatedSection = translateSection(subjectId, section, locale)}
          <article class="timeline-item {state}">
            <div class="state-mark">
              {#if state === 'completed'}
                <CheckCircle2 size={18} />
              {:else if state === 'upcoming'}
                <Lock size={16} />
              {:else}
                <Play size={16} />
              {/if}
            </div>

            <div class="body">
              <h3>{translatedSection.title}</h3>
              <p>{translatedSection.description}</p>
              <div class="meta">{progressInfo.done}/{progressInfo.total} lessons</div>
            </div>

            {#if state === 'upcoming'}
              <span class="action disabled">{sectionActionLabel(index)}</span>
            {:else}
              <a class="action" href={sectionActionLink(index)}>{sectionActionLabel(index)}</a>
            {/if}
          </article>
        {/each}
      </div>
    </section>

    <SubjectIntro {subject} />

    <div class="sections-list">
      <h2>
        <span class="label">{i18n.t('learn.curriculum')}</span>
        <span class="line"></span>
      </h2>
      {#each subject.sections as section}
        <SectionCard {section} {subjectId} />
      {/each}
    </div>
  {:else}
    <div class="error">{i18n.t('learn.subjectNotFound')}</div>
  {/if}
</div>

<style>
  .subject-page {
    max-width: 980px;
    margin: 0 auto;
    padding: 2rem 1rem;
  }

  header {
    margin-bottom: 1.5rem;
  }

  .back-link {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--theme-text-secondary, rgba(229, 231, 235, 0.7));
    text-decoration: none;
    margin-bottom: 1.2rem;
    font-size: 0.9rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .back-link:hover {
    color: var(--theme-primary, #3b82f6);
  }

  .title-row {
    display: flex;
    align-items: center;
    gap: 1.1rem;
  }

  .icon {
    font-size: 2.2rem;
    background: var(--theme-primary-dim, rgba(59, 130, 246, 0.2));
    border: 1px solid var(--theme-border, rgba(59, 130, 246, 0.4));
    width: 64px;
    height: 64px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
  }

  h1 {
    font-size: 1.8rem;
    margin: 0;
    color: var(--theme-primary, #3b82f6);
  }

  .subtitle {
    margin: 0.35rem 0 0;
    color: var(--theme-text-secondary, rgba(229, 231, 235, 0.7));
    font-size: 0.95rem;
  }

  .timeline {
    background: var(--theme-bg-panel, rgba(31, 41, 55, 0.95));
    border: 1px solid var(--theme-border-subtle, rgba(59, 130, 246, 0.2));
    border-radius: 8px;
    padding: 1rem;
    margin: 1.25rem 0 1.5rem;
  }

  h2 {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin: 0 0 0.85rem;
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--theme-text-secondary, rgba(229, 231, 235, 0.7));
  }

  h2 .label {
    flex-shrink: 0;
  }

  h2 .line {
    flex: 1;
    height: 1px;
    background: linear-gradient(
      90deg,
      var(--theme-border, rgba(59, 130, 246, 0.4)) 0%,
      transparent 100%
    );
  }

  .timeline-items {
    display: flex;
    flex-direction: column;
    gap: 0.65rem;
  }

  .timeline-item {
    display: grid;
    grid-template-columns: auto 1fr auto;
    gap: 0.75rem;
    align-items: center;
    border-radius: 8px;
    padding: 0.65rem 0.75rem;
    border: 1px solid rgba(59, 130, 246, 0.18);
    background: rgba(31, 41, 55, 0.5);
  }

  .timeline-item.completed {
    border-color: rgba(34, 197, 94, 0.5);
  }

  .timeline-item.active {
    border-color: rgba(59, 130, 246, 0.55);
  }

  .timeline-item.upcoming {
    opacity: 0.7;
  }

  .state-mark {
    width: 28px;
    height: 28px;
    border-radius: 999px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: var(--theme-text-secondary, #94a3b8);
    border: 1px solid rgba(148, 163, 184, 0.35);
  }

  .timeline-item.completed .state-mark {
    color: #22c55e;
    border-color: rgba(34, 197, 94, 0.55);
  }

  .timeline-item.active .state-mark {
    color: #60a5fa;
    border-color: rgba(59, 130, 246, 0.55);
  }

  .body h3 {
    margin: 0;
    font-size: 0.98rem;
    color: var(--theme-text-primary, #f3f4f6);
  }

  .body p {
    margin: 0.15rem 0;
    font-size: 0.82rem;
    color: var(--theme-text-secondary, #cbd5e1);
  }

  .meta {
    font-family: var(--font-mono, monospace);
    font-size: 0.72rem;
    color: var(--theme-text-muted, #94a3b8);
  }

  .action {
    border: 1px solid rgba(59, 130, 246, 0.5);
    color: #60a5fa;
    text-decoration: none;
    border-radius: 6px;
    padding: 0.3rem 0.55rem;
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    white-space: nowrap;
  }

  .action.disabled {
    border-color: rgba(148, 163, 184, 0.3);
    color: #94a3b8;
  }

  .sections-list {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  .continue-cta,
  .completed-banner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: var(--theme-primary-dim, rgba(59, 130, 246, 0.15));
    border: 1px solid var(--theme-primary, #3b82f6);
    padding: 0.8rem 1rem;
    margin-bottom: 1rem;
    text-decoration: none;
    color: inherit;
    border-radius: 8px;
  }

  .completed-banner {
    background: var(--theme-secondary-dim, rgba(16, 185, 129, 0.15));
    border-color: var(--theme-secondary, #10b981);
  }

  .cta-content {
    display: flex;
    align-items: center;
    gap: 0.8rem;
    color: var(--theme-primary, #3b82f6);
  }

  .completed-banner .cta-content {
    color: var(--theme-secondary, #10b981);
  }

  .cta-text {
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
  }

  .cta-label {
    font-size: 0.95rem;
    font-weight: 600;
    color: var(--theme-text-primary, #f3f4f6);
  }

  .cta-lesson {
    font-size: 0.78rem;
    color: var(--theme-text-secondary, rgba(229, 231, 235, 0.7));
  }

  .cta-progress {
    font-family: var(--font-mono, monospace);
    font-size: 0.78rem;
    color: var(--theme-secondary, #10b981);
  }

  .error {
    text-align: center;
    padding: 4rem;
    color: var(--theme-text-secondary, rgba(229, 231, 235, 0.7));
    background: var(--theme-bg-panel, rgba(31, 41, 55, 0.95));
    border: 1px solid var(--theme-border, rgba(59, 130, 246, 0.4));
    border-radius: 8px;
  }

  @media (max-width: 760px) {
    .timeline-item {
      grid-template-columns: auto 1fr;
    }

    .action,
    .action.disabled {
      grid-column: 1 / -1;
      justify-self: start;
      margin-left: 2.2rem;
    }
  }
</style>
