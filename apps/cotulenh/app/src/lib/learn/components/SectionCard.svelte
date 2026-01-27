<script lang="ts">
  import type { Section, Lesson } from '@cotulenh/learn';
  import { subjectProgress } from '../learn-progress.svelte';

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
</script>

<div class="section-card">
  <div class="header">
    <h4>{section.title}</h4>
    {#if section.introduction}
      <p class="description">{section.introduction}</p>
    {/if}
  </div>

  <div class="lessons-grid">
    {#each section.lessons as lesson}
      {@const stars = getStars(lesson.id)}
      {@const completed = isCompleted(lesson.id)}
      <a
        href="/learn/{lesson.subjectId}/{section.id}/{lesson.id}"
        class="lesson-item"
        class:completed
      >
        <div class="lesson-info">
          <span class="title">{lesson.title}</span>
          <span class="difficulty">{'⭐'.repeat(lesson.difficulty)}</span>
        </div>

        <div class="status">
          {#if completed}
            <div class="stars">
              {#each Array(3) as _, i}
                <span class="star" class:filled={i < stars}>★</span>
              {/each}
            </div>
          {:else}
            <div class="play-icon">▶</div>
          {/if}
        </div>
      </a>
    {/each}
  </div>
</div>

<style>
  .section-card {
    background: var(--surface-1);
    border-radius: 12px;
    padding: 1.5rem;
    border: 1px solid var(--surface-2);
  }

  .header {
    margin-bottom: 1.5rem;
  }

  h4 {
    margin: 0;
    font-size: 1.2rem;
    color: var(--primary);
  }

  .description {
    margin: 0.5rem 0 0 0;
    color: var(--text-secondary);
    font-size: 0.9rem;
  }

  .lessons-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 1rem;
  }

  .lesson-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    background: var(--surface-2);
    border-radius: 8px;
    text-decoration: none;
    color: inherit;
    transition: all 0.2s;
    border: 1px solid transparent;
  }

  .lesson-item:hover {
    background: var(--surface-3);
    border-color: var(--primary);
    transform: translateY(-1px);
  }

  .lesson-item.completed {
    border-color: var(--success);
    background: rgba(var(--success-rgb), 0.1);
  }

  .lesson-info {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .title {
    font-weight: 500;
  }

  .difficulty {
    font-size: 0.7rem;
    opacity: 0.7;
  }

  .stars {
    color: var(--surface-3);
    font-size: 0.9rem;
  }

  .star.filled {
    color: var(--warning);
  }

  .play-icon {
    color: var(--primary);
    font-size: 0.8rem;
  }
</style>
