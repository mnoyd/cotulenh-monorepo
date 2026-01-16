<script lang="ts">
  import type { CategoryInfo, LessonProgress } from '../types';
  import { LearnSession } from '../learn-session.svelte';
  import LessonCard from './LessonCard.svelte';

  type Props = {
    category: CategoryInfo;
  };

  let { category }: Props = $props();

  const allProgress = LearnSession.getAllProgress();
  
  $effect(() => {
    // Reactively compute completion
  });

  function getCompletedCount(): number {
    return category.lessons.filter(l => allProgress[l.id]?.completed).length;
  }
</script>

<div class="category-card">
  <div class="category-header">
    <span class="category-icon">{category.icon}</span>
    <div class="category-info">
      <h2>{category.title}</h2>
      <p>{category.description}</p>
    </div>
    <div class="category-progress">
      {getCompletedCount()}/{category.lessons.length}
    </div>
  </div>
  
  <div class="lessons-grid">
    {#each category.lessons as lesson}
      <LessonCard {lesson} progress={allProgress[lesson.id]} />
    {/each}
  </div>
</div>

<style>
  .category-card {
    background: var(--theme-bg-panel, #222);
    border: 1px solid var(--theme-border, #444);
    border-radius: 12px;
    padding: 1.5rem;
    margin-bottom: 1.5rem;
  }

  .category-header {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid var(--theme-border, #444);
  }

  .category-icon {
    font-size: 2rem;
    width: 48px;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--theme-bg-elevated, #333);
    border-radius: 8px;
  }

  .category-info h2 {
    margin: 0;
    font-size: 1.25rem;
    color: var(--theme-text-primary, #eee);
  }

  .category-info p {
    margin: 0.25rem 0 0;
    font-size: 0.875rem;
    color: var(--theme-text-secondary, #aaa);
  }

  .category-progress {
    margin-left: auto;
    font-size: 0.875rem;
    color: var(--theme-success, #22c55e);
    font-weight: 600;
  }

  .lessons-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 1rem;
  }
</style>
