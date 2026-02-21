<script lang="ts">
  import type { LearnSession } from '../learn-session.svelte';

  interface Props {
    session: LearnSession;
  }

  let { session }: Props = $props();
</script>

<section class="attempt-log hud-corners">
  <header>
    <span>Attempt Log</span>
    <small>{session.attemptLog.length} entries</small>
  </header>

  {#if session.attemptLog.length === 0}
    <p class="empty">Start making moves to build the log.</p>
  {:else}
    <div class="entries">
      {#each session.attemptLog as entry (entry.id)}
        <article class="entry {entry.tone}">
          <span class="tone"></span>
          <p>{entry.message}</p>
        </article>
      {/each}
    </div>
  {/if}
</section>

<style>
  .attempt-log {
    background: var(--theme-bg-panel, #111827);
    border: 1px solid var(--theme-border, rgba(59, 130, 246, 0.35));
    border-radius: 8px;
    padding: 0.9rem;
  }

  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.6rem;
  }

  header span {
    font-size: 0.74rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--theme-text-secondary, #9ca3af);
    font-family: var(--font-mono, monospace);
  }

  header small {
    color: var(--theme-text-muted, #64748b);
    font-size: 0.7rem;
    font-family: var(--font-mono, monospace);
  }

  .empty {
    margin: 0;
    color: var(--theme-text-secondary, #cbd5e1);
    font-size: 0.86rem;
  }

  .entries {
    max-height: 150px;
    overflow: auto;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .entry {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    border: 1px solid var(--theme-border-subtle, rgba(59, 130, 246, 0.2));
    background: var(--theme-bg-elevated, rgba(17, 24, 39, 0.8));
    border-radius: 6px;
    padding: 0.35rem 0.45rem;
  }

  .tone {
    width: 7px;
    height: 7px;
    border-radius: 999px;
    flex-shrink: 0;
  }

  .entry p {
    margin: 0;
    font-size: 0.82rem;
    color: var(--theme-text-primary, #e2e8f0);
  }

  .entry.info .tone {
    background: #60a5fa;
  }

  .entry.success .tone {
    background: #22c55e;
  }

  .entry.warning .tone {
    background: #f59e0b;
  }

  .entry.error .tone {
    background: #ef4444;
  }
</style>
