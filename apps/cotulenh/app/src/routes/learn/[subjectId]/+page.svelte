<script lang="ts">
  import { page } from '$app/stores';
  import { getSubjectById, translateSubject, translateSection, getLessonById, tLessonTitle } from '@cotulenh/learn';
  import SubjectIntro from '$lib/learn/components/SubjectIntro.svelte';
  import SectionCard from '$lib/learn/components/SectionCard.svelte';
  import { subjectProgress } from '$lib/learn/learn-progress.svelte';
  import { ArrowLeft, Play, RotateCcw } from 'lucide-svelte';
  import { getI18n } from '$lib/i18n/index.svelte';

  const i18n = getI18n();
  const subjectId = $derived($page.params.subjectId ?? '');
  const subject = $derived(subjectId ? getSubjectById(subjectId) : null);
  const nextLessonInfo = $derived(subjectId ? subjectProgress.getNextIncompleteLesson(subjectId) : null);
  const progress = $derived(subjectId ? subjectProgress.getSubjectProgress(subjectId) : null);

  // Reactive translations
  const locale = $derived(i18n.getLocale() as 'en' | 'vi');
  const translatedSubject = $derived(subject ? translateSubject(subject, locale) : null);
  const nextLessonTitle = $derived(
    nextLessonInfo
      ? tLessonTitle(subjectId, nextLessonInfo.lessonId, nextLessonInfo.title, locale)
      : null
  );
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
        <span class="cta-progress">{progress?.progress ?? 0}% {i18n.t('learn.complete')}</span>
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
    max-width: 900px;
    margin: 0 auto;
    padding: 2rem 1rem;
  }

  header {
    margin-bottom: 2rem;
  }

  .back-link {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--theme-text-secondary, rgba(229, 231, 235, 0.7));
    text-decoration: none;
    margin-bottom: 1.5rem;
    font-size: 0.9rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .back-link:hover {
    color: var(--theme-primary, #3b82f6);
    text-shadow: var(--theme-glow-primary, 0 0 10px rgba(59, 130, 246, 0.5));
  }

  .title-row {
    display: flex;
    align-items: center;
    gap: 1.5rem;
  }

  .icon {
    font-size: 2.5rem;
    background: var(--theme-primary-dim, rgba(59, 130, 246, 0.2));
    border: 1px solid var(--theme-border, rgba(59, 130, 246, 0.4));
    width: 72px;
    height: 72px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
  }

  .title-text {
    flex: 1;
  }

  h1 {
    font-size: 2rem;
    margin: 0;
    color: var(--theme-primary, #3b82f6);
    text-shadow: var(--theme-glow-primary, 0 0 10px rgba(59, 130, 246, 0.5));
  }

  .subtitle {
    margin: 0.5rem 0 0;
    color: var(--theme-text-secondary, rgba(229, 231, 235, 0.7));
    font-size: 1rem;
  }

  .sections-list {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  h2 {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin: 0 0 1rem;
    font-size: 0.9rem;
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

  .error {
    text-align: center;
    padding: 4rem;
    color: var(--theme-text-secondary, rgba(229, 231, 235, 0.7));
    background: var(--theme-bg-panel, rgba(31, 41, 55, 0.95));
    border: 1px solid var(--theme-border, rgba(59, 130, 246, 0.4));
    border-radius: 4px;
  }

  .continue-cta,
  .completed-banner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: var(--theme-primary-dim, rgba(59, 130, 246, 0.15));
    border: 1px solid var(--theme-primary, #3b82f6);
    padding: 1rem 1.5rem;
    margin-bottom: 2rem;
    text-decoration: none;
    color: inherit;
    border-radius: 4px;
  }

  .continue-cta:hover {
    background: var(--theme-primary-dim, rgba(59, 130, 246, 0.25));
    box-shadow: var(--theme-glow-primary, 0 0 15px rgba(59, 130, 246, 0.4));
  }

  .completed-banner {
    background: var(--theme-secondary-dim, rgba(16, 185, 129, 0.15));
    border-color: var(--theme-secondary, #10b981);
  }

  .cta-content {
    display: flex;
    align-items: center;
    gap: 1rem;
    color: var(--theme-primary, #3b82f6);
  }

  .completed-banner .cta-content {
    color: var(--theme-secondary, #10b981);
  }

  .cta-text {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
  }

  .cta-label {
    font-size: 1.1rem;
    font-weight: 600;
    color: var(--theme-text-primary, #f3f4f6);
  }

  .cta-lesson {
    font-size: 0.85rem;
    color: var(--theme-text-secondary, rgba(229, 231, 235, 0.7));
  }

  .cta-progress {
    font-family: var(--font-mono, 'Share Tech Mono', monospace);
    font-size: 0.85rem;
    color: var(--theme-secondary, #10b981);
  }
</style>
