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
      ? 'Guided assist is active: hints can escalate while you explore.'
      : 'Practice assist is minimal: request hints manually when needed.'
  );

  const hintLevel = $derived.by(() => {
    if (mode === 'practice') return 'Manual';
    const level = session.currentHintLevel;
    if (level === 'none') return 'None';
    if (level === 'subtle') return 'Subtle';
    if (level === 'medium') return 'Medium';
    return 'Explicit';
  });

  const hintActionLabel = $derived(mode === 'guided' ? i18n.t('learn.hint') : 'Reveal Hint');
</script>

<section class="attempt-card hud-corners">
  <header>
    <span class="label">{mode === 'guided' ? 'Guided Assist' : 'Practice Assist'}</span>
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
      <span class="meta">Hints</span>
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
    gap: 0.8rem;
  }

  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .label {
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--theme-text-secondary, #9ca3af);
    font-family: var(--font-mono, monospace);
  }

  .hint-level {
    font-family: var(--font-mono, monospace);
    font-size: 0.72rem;
    color: var(--theme-secondary, #10b981);
  }

  .metrics {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.5rem;
  }

  .metrics article {
    background: var(--theme-bg-elevated, rgba(17, 24, 39, 0.8));
    border: 1px solid var(--theme-border-subtle, rgba(59, 130, 246, 0.2));
    border-radius: 6px;
    padding: 0.45rem 0.5rem;
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
  }

  .meta {
    font-size: 0.62rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--theme-text-secondary, #9ca3af);
    font-family: var(--font-mono, monospace);
  }

  strong {
    font-size: 1rem;
    color: var(--theme-text-primary, #f3f4f6);
  }

  .mode-tip {
    margin: 0;
    font-size: 0.84rem;
    color: var(--theme-text-secondary, #cbd5e1);
  }

  .actions {
    display: flex;
    gap: 0.5rem;
  }

  .btn {
    flex: 1;
    display: inline-flex;
    justify-content: center;
    align-items: center;
    gap: 0.4rem;
    border-radius: 6px;
    border: 1px solid transparent;
    cursor: pointer;
    padding: 0.55rem 0.6rem;
    font-size: 0.78rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    font-family: var(--font-mono, monospace);
  }

  .btn.hint {
    background: rgba(59, 130, 246, 0.15);
    border-color: rgba(59, 130, 246, 0.55);
    color: #60a5fa;
  }

  .btn.reset {
    background: rgba(148, 163, 184, 0.12);
    border-color: rgba(148, 163, 184, 0.45);
    color: #cbd5e1;
  }

  .btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .feedback {
    border-radius: 6px;
    border: 1px solid rgba(59, 130, 246, 0.5);
    background: rgba(59, 130, 246, 0.12);
    color: #bfdbfe;
    font-size: 0.85rem;
    padding: 0.55rem 0.7rem;
  }
</style>
