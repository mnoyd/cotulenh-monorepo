<script lang="ts">
  import type { Lesson } from '@cotulenh/learn';
  import { Play } from 'lucide-svelte';

  interface Props {
    lesson: Lesson;
    onStart: () => void;
  }

  let { lesson, onStart }: Props = $props();

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
      <span>Start Lesson</span>
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
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(8px);
    animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }

  .modal-content {
    position: relative;
    background: linear-gradient(145deg, rgba(31, 41, 55, 0.95) 0%, rgba(17, 24, 39, 0.98) 100%);
    border: 1px solid rgba(59, 130, 246, 0.3);
    border-top: 1px solid rgba(59, 130, 246, 0.5); /* Highlight top edge */
    border-radius: 16px;
    padding: 2.5rem;
    max-width: min(90vw, 520px);
    max-height: 90vh;
    overflow-y: auto;
    box-shadow:
      0 0 0 1px rgba(0, 0, 0, 0.2),
      /* Inner stroke */ 0 20px 50px -12px rgba(0, 0, 0, 0.8),
      /* Deep shadow */ 0 0 30px rgba(59, 130, 246, 0.15); /* Glow */
    animation: slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    transform-origin: center bottom;
  }

  .modal-title {
    color: var(--theme-primary, #3b82f6);
    font-size: 2rem; /* Larger title */
    font-weight: 800;
    margin: 0 0 1rem;
    text-shadow: 0 0 20px rgba(59, 130, 246, 0.4);
    letter-spacing: -0.02em;
    line-height: 1.1;
  }

  .modal-description {
    color: var(--theme-text-primary, #f3f4f6);
    line-height: 1.6;
    margin: 0 0 1.5rem;
    font-size: 1.1rem;
    opacity: 0.9;
  }

  .content-excerpt {
    color: var(--theme-text-secondary, #9ca3af);
    font-size: 0.95rem;
    line-height: 1.6;
    margin: 0 0 2rem;
    padding: 1.25rem;
    background: rgba(0, 0, 0, 0.3);
    border-radius: 8px;
    border-left: 3px solid var(--theme-secondary, #10b981);
    font-style: italic;
  }

  .start-button {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    width: 100%;
    padding: 1rem 2rem;
    background: linear-gradient(to bottom, #3b82f6, #2563eb);
    color: white;
    border: none;
    border-top: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 8px;
    font-size: 1.1rem;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s ease;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    box-shadow:
      0 4px 6px rgba(0, 0, 0, 0.2),
      0 0 15px rgba(59, 130, 246, 0.4);
  }

  .start-button:hover {
    background: linear-gradient(to bottom, #4d8bf7, #3b82f6);
    transform: translateY(-2px);
    box-shadow:
      0 6px 12px rgba(0, 0, 0, 0.3),
      0 0 25px rgba(59, 130, 246, 0.6);
  }

  .start-button:active {
    transform: translateY(0);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  @keyframes slideUp {
    from {
      opacity: 0;
      transform: scale(0.9) translateY(20px);
    }
    to {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }
</style>
