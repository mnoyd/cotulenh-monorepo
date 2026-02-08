<script lang="ts">
  import type { Lesson } from '@cotulenh/learn';
  import { getI18n } from '$lib/i18n/index.svelte';
  import { Play } from 'lucide-svelte';

  interface Props {
    lesson: Lesson;
    onStart: () => void;
  }

  let { lesson, onStart }: Props = $props();

  const i18n = getI18n();

  function stripMarkdown(text: string): string {
    return text
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '') // Remove images
      .replace(/[#*_`~\[\]()]/g, '') // Remove markdown syntax chars
      .replace(/\n{2,}/g, ' ') // Normalize whitespace
      .trim();
  }

  const contentExcerpt = $derived.by(() => {
    if (!lesson.content) return null;
    const stripped = stripMarkdown(lesson.content);
    if (stripped.length <= 100) return stripped;
    return stripped.slice(0, 100).trim() + '...';
  });
</script>

<div class="modal-backdrop" role="presentation">
  <div class="modal-content" role="dialog" aria-labelledby="lesson-title" aria-modal="true">
    <h2 id="lesson-title" class="modal-title">{lesson.title}</h2>
    
    <p class="modal-description">{lesson.description}</p>
    
    {#if contentExcerpt}
      <p class="content-excerpt">{contentExcerpt}</p>
    {/if}

    <button class="start-button" onclick={onStart}>
      <Play size={20} />
      <span>{i18n.t('learn.startLesson')}</span>
    </button>
  </div>
</div>

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    z-index: 50;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(4px);
    animation: fadeIn 0.2s ease-out;
  }

  .modal-content {
    background: var(--theme-bg-panel, rgba(31, 41, 55, 0.95));
    border: 1px solid var(--theme-border-subtle, rgba(59, 130, 246, 0.2));
    border-radius: 8px;
    padding: 2rem;
    max-width: min(90vw, 480px);
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
    animation: zoomIn 0.2s ease-out;
  }

  .modal-title {
    color: var(--theme-primary, #3b82f6);
    font-size: 1.5rem;
    margin: 0 0 1rem;
    text-shadow: var(--theme-glow-primary, 0 0 10px rgba(59, 130, 246, 0.5));
  }

  .modal-description {
    color: var(--theme-text-primary, #f3f4f6);
    line-height: 1.6;
    margin: 0 0 1rem;
  }

  .content-excerpt {
    color: var(--theme-text-secondary, #9ca3af);
    font-size: 0.9rem;
    line-height: 1.5;
    margin: 0 0 1.5rem;
    padding: 0.75rem;
    background: var(--theme-bg-dark, rgba(17, 24, 39, 0.5));
    border-radius: 4px;
    border-left: 2px solid var(--theme-secondary, #10b981);
  }

  .start-button {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    width: 100%;
    padding: 0.875rem 1.5rem;
    background: var(--theme-primary, #3b82f6);
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .start-button:hover {
    background: var(--theme-primary-hover, #2563eb);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
  }

  .start-button:active {
    transform: translateY(0);
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  @keyframes zoomIn {
    from {
      opacity: 0;
      transform: scale(0.95);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }
</style>
