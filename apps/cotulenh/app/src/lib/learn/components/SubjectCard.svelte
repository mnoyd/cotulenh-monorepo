<script lang="ts">
  import type { Subject, SubjectProgress } from '@cotulenh/learn';
  import { translateSubject } from '@cotulenh/learn';
  import ProgressIndicator from './ProgressIndicator.svelte';
  import { subjectProgress } from '../learn-progress.svelte';
  import { getI18n } from '$lib/i18n';
  import { Lock, ChevronRight, Play } from 'lucide-svelte';
  import { goto } from '$app/navigation';

  interface Props {
    subject: Subject;
    progress: SubjectProgress;
    isLocked: boolean;
  }

  let { subject, progress, isLocked }: Props = $props();

  const i18n = getI18n();

  // Reactive translations based on current locale
  const locale = $derived(i18n.getLocale() as 'en' | 'vi');
  const translatedSubject = $derived(translateSubject(subject, locale));

  const nextLesson = $derived(
    !isLocked ? subjectProgress.getNextIncompleteLesson(subject.id) : null
  );

  function handleContinue(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (nextLesson) {
      goto(`/learn/${subject.id}/${nextLesson.sectionId}/${nextLesson.lessonId}`);
    }
  }
</script>

<a
  href={isLocked ? undefined : `/learn/${subject.id}`}
  class="subject-card hud-corners"
  class:locked={isLocked}
  class:completed={progress.completed}
>
  <div class="content">
    <div class="header">
      <div class="icon-wrapper">
        <span class="icon">{subject.icon}</span>
        {#if isLocked}
          <div class="lock-overlay">
            <Lock size={12} />
          </div>
        {/if}
      </div>
      <div class="info">
        <h3>{translatedSubject.title}</h3>
        <p>{translatedSubject.description}</p>
      </div>
    </div>

    <div class="meta">
      {#if isLocked}
        <span class="status-locked">
          <Lock size={14} />
          {i18n.t('learn.locked')}
        </span>
      {:else}
        <div class="progress">
          <ProgressIndicator value={progress.progress} size="sm" />
          <span class="progress-text">{progress.progress}%</span>
        </div>
        {#if nextLesson}
          <button
            class="continue-btn"
            onclick={handleContinue}
          >
            <Play size={14} />
            {i18n.t('learn.continue')}
          </button>
        {:else}
          <div class="go-arrow">
            <ChevronRight size={20} />
          </div>
        {/if}
      {/if}
    </div>
  </div>
</a>

<style>
  .subject-card {
    display: block;
    background: var(--theme-bg-panel, rgba(31, 41, 55, 0.95));
    border: 1px solid var(--theme-border-subtle, rgba(59, 130, 246, 0.2));
    border-radius: 4px;
    padding: 1.5rem;
    color: inherit;
    text-decoration: none;
    position: relative;
    overflow: hidden;
  }

  .subject-card:not(.locked):hover {
    border-color: var(--theme-primary, #3b82f6);
    box-shadow: var(--theme-glow-primary, 0 0 10px rgba(59, 130, 246, 0.5));
  }

  .subject-card:not(.locked):hover .go-arrow {
    color: var(--theme-primary, #3b82f6);
    transform: translateX(4px);
  }

  .locked {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .header {
    display: flex;
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .icon-wrapper {
    position: relative;
    width: 52px;
    height: 52px;
    background: var(--theme-primary-dim, rgba(59, 130, 246, 0.2));
    border: 1px solid var(--theme-border, rgba(59, 130, 246, 0.4));
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.5rem;
    flex-shrink: 0;
  }

  .lock-overlay {
    position: absolute;
    bottom: -6px;
    right: -6px;
    background: var(--theme-bg-elevated, rgba(55, 65, 81, 0.95));
    border: 1px solid var(--theme-border, rgba(59, 130, 246, 0.4));
    border-radius: 4px;
    width: 22px;
    height: 22px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--theme-text-muted, rgba(229, 231, 235, 0.5));
  }

  .info {
    flex: 1;
    min-width: 0;
  }

  .info h3 {
    margin: 0 0 0.35rem 0;
    font-size: 1.1rem;
    color: var(--theme-text-primary, #f3f4f6);
  }

  .info p {
    margin: 0;
    color: var(--theme-text-secondary, rgba(229, 231, 235, 0.7));
    font-size: 0.85rem;
    line-height: 1.5;
  }

  .meta {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: 1rem;
    border-top: 1px solid var(--theme-border-subtle, rgba(59, 130, 246, 0.2));
  }

  .status-locked {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--theme-text-muted, rgba(229, 231, 235, 0.5));
    font-size: 0.85rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .progress {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .progress-text {
    font-family: var(--font-mono, 'Share Tech Mono', monospace);
    font-size: 0.9rem;
    color: var(--theme-secondary, #10b981);
  }

  .go-arrow {
    color: var(--theme-text-muted, rgba(229, 231, 235, 0.5));
    transition: all 0.15s ease;
  }

  .completed .icon-wrapper {
    background: var(--theme-secondary-dim, rgba(16, 185, 129, 0.2));
    border-color: var(--theme-secondary, #10b981);
  }

  .completed .info h3 {
    color: var(--theme-secondary, #10b981);
  }

  .continue-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.4rem 0.75rem;
    background: var(--theme-primary-dim, rgba(59, 130, 246, 0.2));
    border: 1px solid var(--theme-primary, #3b82f6);
    border-radius: 4px;
    color: var(--theme-primary, #3b82f6);
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    text-decoration: none;
    transition: all 0.15s ease;
  }

  .continue-btn:hover {
    background: var(--theme-primary, #3b82f6);
    color: white;
    box-shadow: var(--theme-glow-primary, 0 0 10px rgba(59, 130, 246, 0.5));
  }
</style>
