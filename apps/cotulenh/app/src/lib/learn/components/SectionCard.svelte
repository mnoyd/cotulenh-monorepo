<script lang="ts">
  import type { Section } from '@cotulenh/learn';
  import { subjectProgress } from '../learn-progress.svelte';
  import { ChevronRight, CheckCircle, Play } from 'lucide-svelte';

  interface Props {
    section: Section;
  }

  let { section }: Props = $props();

  function getStars(lessonId: string) {
    return subjectProgress.getLessonStars(lessonId);
  }

  function isCompleted(lessonId: string) {
    return subjectProgress.isLessonCompleted(lessonId);
  }

  const completedCount = $derived(
    section.lessons.filter((l) => isCompleted(l.id)).length
  );
  const totalCount = $derived(section.lessons.length);
  const progressPercent = $derived(
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0
  );
</script>

<div class="section-card">
  <div class="header">
    <div class="title-row">
      <h4>{section.title}</h4>
      <span class="progress-badge" class:complete={progressPercent === 100}>
        {completedCount}/{totalCount}
      </span>
    </div>
    {#if section.description}
      <p class="description">{section.description}</p>
    {/if}
    <div class="progress-bar">
      <div class="progress-fill" style="width: {progressPercent}%"></div>
    </div>
  </div>

  <div class="lessons-grid">
    {#each section.lessons as lesson, index}
      {@const stars = getStars(lesson.id)}
      {@const completed = isCompleted(lesson.id)}
      <a
        href="/learn/{lesson.subjectId}/{section.id}/{lesson.id}"
        class="lesson-item"
        class:completed
      >
        <div class="lesson-number">{String(index + 1).padStart(2, '0')}</div>
        
        <div class="lesson-info">
          <span class="title">{lesson.title}</span>
          <span class="difficulty">
            {#each Array(lesson.difficulty) as _}
              <span class="dot"></span>
            {/each}
          </span>
        </div>

        <div class="status">
          {#if completed}
            <div class="stars">
              {#each Array(3) as _, i}
                <span class="star" class:filled={i < stars}>★</span>
              {/each}
            </div>
            <CheckCircle size={16} class="check-icon" />
          {:else}
            <Play size={14} />
          {/if}
        </div>
      </a>
    {/each}
  </div>
</div>

<style>
  .section-card {
    background: var(--theme-bg-panel, rgba(31, 41, 55, 0.95));
    border-radius: 4px;
    padding: 1.5rem;
    border: 1px solid var(--theme-border-subtle, rgba(59, 130, 246, 0.2));
  }

  .header {
    margin-bottom: 1.5rem;
  }

  .title-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 0.5rem;
  }

  h4 {
    margin: 0;
    font-size: 1.1rem;
    color: var(--theme-primary, #3b82f6);
    font-weight: 600;
  }

  .progress-badge {
    font-size: 0.75rem;
    padding: 0.25rem 0.5rem;
    background: var(--theme-bg-elevated, rgba(55, 65, 81, 0.95));
    border: 1px solid var(--theme-border-subtle, rgba(59, 130, 246, 0.2));
    border-radius: 4px;
    color: var(--theme-text-secondary, rgba(229, 231, 235, 0.7));
    font-family: var(--font-mono, 'Share Tech Mono', monospace);
  }

  .progress-badge.complete {
    background: var(--theme-secondary-dim, rgba(16, 185, 129, 0.2));
    border-color: var(--theme-secondary, #10b981);
    color: var(--theme-secondary, #10b981);
  }

  .description {
    margin: 0;
    color: var(--theme-text-secondary, rgba(229, 231, 235, 0.7));
    font-size: 0.9rem;
    line-height: 1.5;
  }

  .progress-bar {
    margin-top: 1rem;
    height: 3px;
    background: var(--theme-bg-elevated, rgba(55, 65, 81, 0.95));
    border-radius: 2px;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background: linear-gradient(
      90deg,
      var(--theme-primary, #3b82f6) 0%,
      var(--theme-secondary, #10b981) 100%
    );
    transition: width 0.3s ease;
  }

  .lessons-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 0.75rem;
  }

  .lesson-item {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.75rem 1rem;
    background: var(--theme-bg-elevated, rgba(55, 65, 81, 0.5));
    border-radius: 4px;
    text-decoration: none;
    color: inherit;
    border: 1px solid transparent;
    transition: all 0.15s ease;
  }

  .lesson-item:hover {
    background: var(--theme-primary-dim, rgba(59, 130, 246, 0.15));
    border-color: var(--theme-border, rgba(59, 130, 246, 0.4));
  }

  .lesson-item.completed {
    border-color: var(--theme-secondary, #10b981);
    border-left-width: 3px;
  }

  .lesson-number {
    font-family: var(--font-mono, 'Share Tech Mono', monospace);
    font-size: 0.75rem;
    color: var(--theme-text-muted, rgba(229, 231, 235, 0.5));
    min-width: 1.5rem;
  }

  .lesson-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .title {
    font-weight: 500;
    font-size: 0.95rem;
    color: var(--theme-text-primary, #f3f4f6);
  }

  .difficulty {
    display: flex;
    gap: 4px;
  }

  .dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--theme-accent, #f59e0b);
  }

  .status {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--theme-primary, #3b82f6);
  }

  .stars {
    font-size: 0.8rem;
    color: var(--theme-text-muted, rgba(229, 231, 235, 0.5));
  }

  .star.filled {
    color: var(--theme-accent, #f59e0b);
  }

  .status :global(.check-icon) {
    color: var(--theme-secondary, #10b981);
  }
</style>
