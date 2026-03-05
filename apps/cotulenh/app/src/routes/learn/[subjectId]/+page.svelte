<script lang="ts">
  import { page } from '$app/stores';
  import { getSubjectById, translateSubject, translateSection, tLessonTitle } from '@cotulenh/learn';
  import SubjectIntro from '$lib/learn/components/SubjectIntro.svelte';
  import SectionCard from '$lib/learn/components/SectionCard.svelte';
  import { subjectProgress } from '$lib/learn/learn-progress.svelte';
  import { getI18n } from '$lib/i18n/index.svelte';
  import CommandCenter from '$lib/components/CommandCenter.svelte';
  import '$lib/styles/command-center.css';

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
    if (state === 'completed') return i18n.t('learn.actionReview');
    if (state === 'active') {
      const { done } = sectionProgress(sectionIndex);
      return done > 0 ? i18n.t('learn.actionContinue') : i18n.t('learn.actionStart');
    }
    return i18n.t('learn.actionLocked');
  }
</script>

<CommandCenter center={centerContent} />

{#snippet centerContent()}
  <div class="subject-center">
    {#if subject}
      <a href="/learn" class="text-link">{i18n.t('learn.backToSubjects')}</a>

      <div class="title-row">
        <span class="subject-icon">{subject.icon}</span>
        <h1 class="subject-title">{translatedSubject?.title}</h1>
        <span class="progress-label">{progressPercentLabel}</span>
      </div>
      <p class="text-secondary">{translatedSubject?.description}</p>

      {#if nextLessonInfo}
        <hr class="divider" />
        <span class="section-header">{i18n.t('learn.continue')}</span>
        <a
          class="text-link"
          href="/learn/{subjectId}/{nextLessonInfo.sectionId}/{nextLessonInfo.lessonId}"
        >
          {nextLessonTitle}
        </a>
      {:else if progress?.completed}
        <hr class="divider" />
        <span class="text-secondary">{i18n.t('learn.subjectCompleted')}</span>
      {/if}

      <hr class="divider" />

      <span class="section-header">{i18n.t('learn.missionTimeline')}</span>
      <div class="flat-list">
        {#each subject.sections as section, index}
          {@const state = sectionState(index)}
          {@const progressInfo = sectionProgress(index)}
          {@const translatedSection = translateSection(subjectId, section, locale)}
          <div class="section-row" class:locked={state === 'upcoming'}>
            <div class="section-info">
              <span class="section-name">{translatedSection.title}</span>
              <span class="section-meta">{progressInfo.done}/{progressInfo.total}</span>
            </div>
            {#if state === 'upcoming'}
              <span class="text-secondary">{sectionActionLabel(index)}</span>
            {:else}
              <a class="text-link" href={sectionActionLink(index)}>{sectionActionLabel(index)}</a>
            {/if}
          </div>
        {/each}
      </div>

      <hr class="divider" />

      <SubjectIntro {subject} />

      <div class="sections-detail">
        {#each subject.sections as section}
          <SectionCard {section} {subjectId} />
        {/each}
      </div>
    {:else}
      <p class="text-secondary">{i18n.t('learn.subjectNotFound')}</p>
    {/if}
  </div>
{/snippet}

<style>
  .subject-center {
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

  .title-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .subject-icon {
    font-size: 1.25rem;
  }

  .subject-title {
    margin: 0;
    font-size: 1.125rem;
    font-weight: 700;
    color: var(--theme-text-primary, #eee);
    flex: 1;
  }

  .progress-label {
    font-family: var(--font-mono, monospace);
    font-size: 0.8125rem;
    color: var(--theme-text-secondary, #aaa);
  }

  .section-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.25rem 0;
  }

  .section-row.locked {
    opacity: 0.5;
  }

  .section-info {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .section-name {
    font-size: 0.875rem;
    color: var(--theme-text-primary, #eee);
  }

  .section-meta {
    font-family: var(--font-mono, monospace);
    font-size: 0.75rem;
    color: var(--theme-text-secondary, #aaa);
  }

  .sections-detail {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
</style>
