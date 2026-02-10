<script lang="ts">
  import { ChevronRight } from 'lucide-svelte';
  import { getLessonContext, translateSubject, translateSection } from '@cotulenh/learn';
  import { subjectProgress } from '$lib/learn/learn-progress.svelte';
  import { getI18n } from '$lib/i18n/index.svelte';

  interface Props {
    lessonId: string;
  }

  let { lessonId }: Props = $props();

  const i18n = getI18n();

  const context = $derived(getLessonContext(lessonId));
  const subject = $derived(context?.subject);
  const section = $derived(context?.section);
  const positionInSection = $derived(context?.positionInSection ?? 0);
  const totalInSection = $derived(context?.totalInSection ?? 0);

  const sectionLessons = $derived(section?.lessons ?? []);

  // Reactive translations
  const locale = $derived(i18n.getLocale() as 'en' | 'vi');
  const translatedSubject = $derived(subject ? translateSubject(subject, locale) : null);
  const translatedSection = $derived(
    subject && section ? translateSection(subject.id, section, locale) : null
  );
  const lessonCountLabel = $derived(
    i18n
      .t('learn.lessonProgress')
      .replace('{current}', String(positionInSection))
      .replace('{total}', String(totalInSection))
  );

  function isLessonCompleted(id: string): boolean {
    return subjectProgress.isLessonCompleted(id);
  }

  function getLessonNumberLabel(index: number): string {
    return i18n.t('learn.lessonNumber').replace('{number}', String(index + 1));
  }
</script>

{#if context && subject && section}
  <div class="lesson-stepper">
    <div class="breadcrumb-row">
      <div class="breadcrumb">
        <a href="/learn/{subject.id}" class="breadcrumb-link">{translatedSubject?.title}</a>
        <ChevronRight size={14} class="separator" />
        <span class="breadcrumb-section">{translatedSection?.title}</span>
      </div>
      <span class="lesson-count">{lessonCountLabel}</span>
    </div>
    <div class="progress-dots">
      {#each sectionLessons as lesson, i}
        {@const isCurrent = lesson.id === lessonId}
        {@const isCompleted = isLessonCompleted(lesson.id)}
        {@const lessonNumberLabel = getLessonNumberLabel(i)}
        <span
          class="dot"
          class:current={isCurrent}
          class:completed={isCompleted}
          title={lessonNumberLabel}
          aria-label={lessonNumberLabel}
        ></span>
      {/each}
    </div>
  </div>
{/if}

<style>
  .lesson-stepper {
    background: var(--theme-bg-panel, #222);
    border: 1px solid var(--theme-border, #444);
    border-radius: 8px;
    padding: 0.75rem 1rem;
  }

  .breadcrumb-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
  }

  .breadcrumb {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.875rem;
  }

  .breadcrumb-link {
    color: var(--theme-primary, #3b82f6);
    text-decoration: none;
  }

  .breadcrumb-link:hover {
    text-decoration: underline;
  }

  .breadcrumb :global(.separator) {
    color: var(--theme-text-secondary, #aaa);
  }

  .breadcrumb-section {
    color: var(--theme-text-secondary, #aaa);
  }

  .lesson-count {
    font-size: 0.75rem;
    color: var(--theme-text-secondary, #aaa);
  }

  .progress-dots {
    display: flex;
    gap: 0.5rem;
  }

  .dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    border: 2px solid var(--theme-text-secondary, #aaa);
    background: transparent;
  }

  .dot.completed {
    background: var(--theme-success, #22c55e);
    border-color: var(--theme-success, #22c55e);
  }

  .dot.current {
    border-color: var(--theme-primary, #3b82f6);
    box-shadow: 0 0 0 2px var(--theme-primary, #3b82f6);
  }

  .dot.current.completed {
    background: var(--theme-success, #22c55e);
    border-color: var(--theme-success, #22c55e);
    box-shadow: 0 0 0 2px var(--theme-primary, #3b82f6);
  }
</style>
