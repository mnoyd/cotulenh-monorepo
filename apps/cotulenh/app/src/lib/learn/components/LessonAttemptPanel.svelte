<script lang="ts">
  import { HelpCircle, RotateCcw } from 'lucide-svelte';
  import type { LearnSession } from '../learn-session.svelte';
  import { getI18n } from '$lib/i18n/index.svelte';

  interface Props {
    session: LearnSession;
    mode: 'guided' | 'practice';
    onHint: () => void;
    onReset: () => void;
  }

  let { session, mode, onHint, onReset }: Props = $props();
  const i18n = getI18n();

  const modeTip = $derived(
    mode === 'guided'
      ? i18n.t('learn.assistGuidedTip')
      : i18n.t('learn.assistPracticeTip')
  );

  const hintLevel = $derived.by(() => {
    if (mode === 'practice') return i18n.t('learn.hintLevelManual');
    const level = session.currentHintLevel;
    if (level === 'none') return i18n.t('learn.hintLevelNone');
    if (level === 'subtle') return i18n.t('learn.hintLevelSubtle');
    if (level === 'medium') return i18n.t('learn.hintLevelMedium');
    return i18n.t('learn.hintLevelExplicit');
  });

  const hintActionLabel = $derived(mode === 'guided' ? i18n.t('learn.hint') : i18n.t('learn.revealHint'));
  const assistLabel = $derived(mode === 'guided' ? i18n.t('learn.assistGuided') : i18n.t('learn.assistPractice'));
</script>

<section class="attempt-card hud-corners">
  <header>
    <span class="label">{assistLabel}</span>
    <span class="hint-level">{hintLevel}</span>
  </header>

  <div class="metrics">
    <article>
      <span class="meta">{i18n.t('learn.moves')}</span>
      <strong>{session.moveCount}</strong>
    </article>
    <article>
      <span class="meta">{i18n.t('learn.mistakes')}</span>
      <strong>{session.mistakeCount}</strong>
    </article>
    <article>
      <span class="meta">{i18n.t('learn.tabHints')}</span>
      <strong>{session.hintsUsed}</strong>
    </article>
  </div>

  <p class="mode-tip">{modeTip}</p>

  <div class="actions">
    <button class="btn hint" onclick={onHint} disabled={!session.hint}>
      <HelpCircle size={15} />
      {hintActionLabel}
    </button>
    <button class="btn reset" onclick={onReset}>
      <RotateCcw size={15} />
      {i18n.t('learn.reset')}
    </button>
  </div>

  {#if session.showFeedback}
    <div class="feedback">{session.feedbackMessage}</div>
  {/if}
</section>

<style>
  .attempt-card {
    background: var(--theme-bg-panel, #111827);
    border: 1px solid var(--theme-border, rgba(59, 130, 246, 0.35));
    border-radius: 8px;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
  }

  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.68rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--theme-text-secondary, #9ca3af);
    font-family: var(--font-mono, monospace);
  }

  .hint-level {
    padding: 0.15rem 0.4rem;
    background: var(--theme-bg-elevated, rgba(55, 65, 81, 0.95));
    border-radius: 4px;
    color: var(--theme-accent, #f59e0b);
  }

  .metrics {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.5rem;
  }

  .metrics article {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.1rem;
    background: var(--theme-bg-elevated, rgba(55, 65, 81, 0.5));
    padding: 0.4rem;
    border-radius: 6px;
  }

  .metrics .meta {
    font-size: 0.62rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--theme-text-secondary, #9ca3af);
    font-family: var(--font-mono, monospace);
  }

  .metrics strong {
    font-size: 0.95rem;
    color: var(--theme-text-primary, #f3f4f6);
  }

  .mode-tip {
    margin: 0;
    font-size: 0.75rem;
    color: var(--theme-text-secondary, #d1d5db);
    line-height: 1.4;
    font-style: italic;
  }

  .actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
  }

  .btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.4rem;
    padding: 0.45rem 0.6rem;
    border-radius: 6px;
    border: 1px solid;
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    cursor: pointer;
    transition: all 0.15s ease;
    font-family: var(--font-mono, monospace);
  }

  .btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .btn.hint {
    background: var(--theme-accent-dim, rgba(245, 158, 11, 0.15));
    border-color: var(--theme-accent, rgba(245, 158, 11, 0.5));
    color: var(--theme-accent, #f59e0b);
  }

  .btn.hint:not(:disabled):hover {
    background: rgba(245, 158, 11, 0.25);
  }

  .btn.reset {
    background: var(--theme-bg-elevated, rgba(55, 65, 81, 0.5));
    border-color: var(--theme-border-subtle, rgba(148, 163, 184, 0.3));
    color: var(--theme-text-secondary, #d1d5db);
  }

  .btn.reset:hover {
    background: rgba(55, 65, 81, 0.8);
    border-color: var(--theme-border, rgba(148, 163, 184, 0.5));
  }

  .feedback {
    padding: 0.5rem 0.6rem;
    border-radius: 6px;
    font-size: 0.8rem;
    line-height: 1.4;
    text-align: center;
  }

  .feedback:global(.tone-success) {
    background: var(--theme-secondary-dim, rgba(16, 185, 129, 0.15));
    border: 1px solid var(--theme-secondary, rgba(16, 185, 129, 0.4));
    color: var(--theme-secondary, #10b981);
  }

  .feedback:global(.tone-error) {
    background: var(--theme-error-dim, rgba(239, 68, 68, 0.15));
    border: 1px solid var(--theme-error, rgba(239, 68, 68, 0.4));
    color: var(--theme-error, #ef4444);
  }

  .feedback:global(.tone-warning) {
    background: var(--theme-accent-dim, rgba(245, 158, 11, 0.15));
    border: 1px solid var(--theme-accent, rgba(245, 158, 11, 0.4));
    color: var(--theme-accent, #f59e0b);
  }
</style>
