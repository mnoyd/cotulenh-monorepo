<script lang="ts">
  import type { Subject, SubjectProgress } from '@cotulenh/learn';
  import ProgressIndicator from './ProgressIndicator.svelte';

  interface Props {
    subject: Subject;
    progress: SubjectProgress;
    isLocked: boolean;
  }

  let { subject, progress, isLocked }: Props = $props();
</script>

<a
  href={isLocked ? undefined : `/learn/${subject.id}`}
  class="subject-card"
  class:locked={isLocked}
  class:completed={progress.completed}
>
  <div class="content">
    <div class="header">
      <div class="icon-wrapper">
        <span class="icon">{subject.icon}</span>
        {#if isLocked}
          <div class="lock-overlay">🔒</div>
        {/if}
      </div>
      <div class="info">
        <h3>{subject.title}</h3>
        <p>{subject.description}</p>
      </div>
    </div>

    <div class="meta">
      {#if isLocked}
        <span class="status">Locked</span>
      {:else}
        <div class="progress">
          <ProgressIndicator value={progress.progress} size="sm" />
          <span>{progress.progress}% Complete</span>
        </div>
      {/if}
    </div>
  </div>
</a>

<style>
  .subject-card {
    display: block;
    background: var(--surface-1);
    border: 1px solid var(--surface-2);
    border-radius: 12px;
    padding: 1.5rem;
    color: inherit;
    text-decoration: none;
    transition: all 0.2s;
    position: relative;
    overflow: hidden;
  }

  .subject-card:not(.locked):hover {
    transform: translateY(-2px);
    border-color: var(--primary);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  .locked {
    opacity: 0.6;
    cursor: not-allowed;
    background: var(--surface-0);
  }

  .header {
    display: flex;
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .icon-wrapper {
    position: relative;
    width: 48px;
    height: 48px;
    background: var(--surface-2);
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.5rem;
  }

  .lock-overlay {
    position: absolute;
    bottom: -4px;
    right: -4px;
    background: var(--surface-0);
    border-radius: 50%;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.8rem;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }

  .info h3 {
    margin: 0 0 0.25rem 0;
    font-size: 1.1rem;
  }

  .info p {
    margin: 0;
    color: var(--text-secondary);
    font-size: 0.9rem;
    line-height: 1.4;
  }

  .meta {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    font-size: 0.9rem;
  }

  .progress {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    color: var(--text-secondary);
  }

  .completed .icon-wrapper {
    background: var(--success);
    color: white;
  }
</style>
