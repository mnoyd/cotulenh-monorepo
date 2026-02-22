<script lang="ts">
  import { CheckCircle, Star } from 'lucide-svelte';
  import type { LearnSession } from '../learn-session.svelte';
  import { getI18n } from '$lib/i18n/index.svelte';

  interface Props {
    session: LearnSession;
    onRestart: () => void;
    onContinue: () => void;
  }

  let { session, onRestart, onContinue }: Props = $props();
  const i18n = getI18n();

  const masteryLabel = $derived.by(() => {
    if (session.mastery === 'efficient') return i18n.t('learn.masteryEfficient');
    if (session.mastery === 'assisted') return i18n.t('learn.masteryAssisted');
    return i18n.t('learn.masteryNeedsReview');
  });
</script>

<div class="completion-card" data-mode={session.assistMode}>
  <div class="completion-head">
    <CheckCircle size={24} />
    <h2>{i18n.t('learn.lessonComplete')}</h2>
  </div>

  <div class="mastery-row">
    <span class="mastery-label">{i18n.t('learn.masteryLabel')}</span>
    <strong class="mastery-value {session.mastery}">{masteryLabel}</strong>
  </div>

  {#if session.gradingSystem === 'stars'}
    <div class="stars-earned">
      {#each [1, 2, 3] as i}
        <Star
          size={24}
          fill={i <= session.effectiveStars ? '#fbbf24' : 'none'}
          color={i <= session.effectiveStars ? '#fbbf24' : '#64748b'}
          strokeWidth={1.5}
        />
      {/each}
    </div>
  {/if}

  <div class="completion-actions">
    <button class="btn secondary" onclick={onRestart}>{i18n.t('common.tryAgain')}</button>
    <button class="btn primary" onclick={onContinue}>{i18n.t('common.continue')}</button>
  </div>
</div>

<style>
  .completion-card {
    border: 1px solid rgba(34, 197, 94, 0.55);
    background: rgba(5, 46, 22, 0.42);
    border-radius: 8px;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.8rem;
  }

  .completion-head {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: #22c55e;
  }

  .completion-head h2 {
    margin: 0;
    font-size: 1.1rem;
  }

  .mastery-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .mastery-label {
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--theme-text-secondary, #94a3b8);
    font-family: var(--font-mono, monospace);
  }

  .mastery-value {
    font-size: 0.9rem;
    font-family: var(--font-mono, monospace);
  }

  .mastery-value.efficient {
    color: #22c55e;
  }

  .mastery-value.assisted {
    color: #f59e0b;
  }

  .mastery-value.needs-review {
    color: #f97316;
  }

  .stars-earned {
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }

  .completion-actions {
    display: grid;
    gap: 0.5rem;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .btn {
    border-radius: 6px;
    padding: 0.55rem 0.65rem;
    border: 1px solid transparent;
    cursor: pointer;
    font-size: 0.8rem;
    font-weight: 600;
  }

  .btn.primary {
    background: #22c55e;
    color: #052e16;
  }

  .btn.secondary {
    background: transparent;
    border-color: rgba(148, 163, 184, 0.6);
    color: #cbd5e1;
  }
</style>
