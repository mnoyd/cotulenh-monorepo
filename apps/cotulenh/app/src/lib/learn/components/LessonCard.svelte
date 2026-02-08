<script lang="ts">
  import { Star, CheckCircle } from 'lucide-svelte';
  import type { Lesson, LessonProgress } from '@cotulenh/learn';
  import { translateLesson } from '@cotulenh/learn';
  import { getI18n } from '$lib/i18n/index.svelte';
  import type { TranslationKey } from '$lib/i18n/types';

  type Props = {
    lesson: Lesson;
    subjectId: string;
    progress?: LessonProgress | null;
  };

  let { lesson, subjectId, progress }: Props = $props();

  const i18n = getI18n();

  // Reactive translations based on current locale
  const locale = $derived(i18n.getLocale() as 'en' | 'vi');
  const translatedLesson = $derived(translateLesson(subjectId, lesson, locale));

  function getDifficultyLabel(d: number): string {
    const difficulties: TranslationKey[] = ['common.easy', 'common.medium', 'common.hard'];
    return i18n.t(difficulties[d - 1]);
  }
</script>

<a href="/learn/{lesson.id}" class="lesson-card" class:completed={progress?.completed}>
  <div class="lesson-header">
    <h3>{translatedLesson.title}</h3>
    {#if progress?.completed}
      <CheckCircle size={20} class="check-icon" />
    {/if}
  </div>

  <p class="lesson-description">{translatedLesson.description}</p>
  
  <div class="lesson-footer">
    <span class="difficulty difficulty-{lesson.difficulty}">
      {getDifficultyLabel(lesson.difficulty)}
    </span>
    
    {#if progress?.completed && lesson.grading === 'stars'}
      <div class="stars">
        {#each [1, 2, 3] as i}
          <Star 
            size={14} 
            fill={i <= (progress.stars ?? 0) ? '#fbbf24' : 'none'}
            color={i <= (progress.stars ?? 0) ? '#fbbf24' : '#666'}
          />
        {/each}
      </div>
    {/if}
  </div>
</a>

<style>
  .lesson-card {
    display: flex;
    flex-direction: column;
    padding: 1rem;
    background: var(--theme-bg-base, #1a1a1a);
    border: 1px solid var(--theme-border, #444);
    border-radius: 8px;
    text-decoration: none;
    color: inherit;
    transition: all 0.2s ease;
  }

  .lesson-card:hover {
    border-color: var(--theme-primary, #06b6d4);
    transform: translateY(-2px);
  }

  .lesson-card.completed {
    border-color: var(--theme-success, #22c55e);
  }

  .lesson-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .lesson-header h3 {
    margin: 0;
    font-size: 1rem;
    color: var(--theme-text-primary, #eee);
  }

  .lesson-header :global(.check-icon) {
    color: var(--theme-success, #22c55e);
    flex-shrink: 0;
  }

  .lesson-description {
    margin: 0.5rem 0;
    font-size: 0.75rem;
    color: var(--theme-text-secondary, #aaa);
    flex: 1;
  }

  .lesson-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 0.5rem;
  }

  .difficulty {
    font-size: 0.7rem;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-weight: 500;
  }

  .difficulty-1 {
    background: rgba(34, 197, 94, 0.2);
    color: #22c55e;
  }

  .difficulty-2 {
    background: rgba(251, 191, 36, 0.2);
    color: #fbbf24;
  }

  .difficulty-3 {
    background: rgba(239, 68, 68, 0.2);
    color: #ef4444;
  }

  .stars {
    display: flex;
    gap: 2px;
  }
</style>
