<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    title?: string;
    description?: string;
    children: Snippet;
  }

  let { title, description, children }: Props = $props();
</script>

<article class="learn-content hud-corners">
  {#if title}
    <header class="content-header">
      <h1>{title}</h1>
      {#if description}
        <p class="description">{description}</p>
      {/if}
    </header>
  {/if}
  
  <div class="prose">
    {@render children()}
  </div>
</article>

<style>
  .learn-content {
    max-width: 800px;
    margin: 0 auto;
    padding: 2rem;
    background: var(--theme-bg-panel, rgba(31, 41, 55, 0.95));
    border: 1px solid var(--theme-border, rgba(59, 130, 246, 0.4));
    border-radius: 4px;
  }

  .content-header {
    margin-bottom: 2rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid var(--theme-border-subtle, rgba(59, 130, 246, 0.2));
  }

  .content-header h1 {
    font-size: 2rem;
    margin: 0 0 0.5rem;
    color: var(--theme-primary, #3b82f6);
    text-shadow: var(--theme-glow-primary, 0 0 10px rgba(59, 130, 246, 0.5));
  }

  .description {
    color: var(--theme-text-secondary, rgba(229, 231, 235, 0.7));
    font-size: 1.1rem;
    margin: 0;
  }

  .prose {
    line-height: 1.7;
    color: var(--theme-text-primary, #f3f4f6);
  }

  /* === HEADINGS with theme colors === */
  .prose :global(h1) {
    font-size: 1.75rem;
    margin: 0 0 1.5rem;
    color: var(--theme-primary, #3b82f6);
    font-weight: 700;
    text-shadow: var(--theme-glow-primary, 0 0 10px rgba(59, 130, 246, 0.5));
  }

  .prose :global(h2) {
    font-size: 1.4rem;
    margin: 2.5rem 0 1rem;
    padding: 0.5rem 0;
    padding-left: 1rem;
    border-left: 3px solid var(--theme-primary, #3b82f6);
    background: var(--theme-primary-dim, rgba(59, 130, 246, 0.2));
    color: var(--theme-primary, #3b82f6);
    font-weight: 600;
  }

  .prose :global(h3) {
    font-size: 1.15rem;
    margin: 1.5rem 0 0.75rem;
    color: var(--theme-secondary, #10b981);
    font-weight: 600;
  }

  .prose :global(p) {
    margin: 1rem 0;
  }

  /* === LISTS === */
  .prose :global(ul), .prose :global(ol) {
    margin: 1rem 0;
    padding-left: 1.5rem;
  }

  .prose :global(li) {
    margin: 0.5rem 0;
  }

  .prose :global(li::marker) {
    color: var(--theme-primary, #3b82f6);
  }

  /* === MEDIA === */
  .prose :global(img) {
    max-width: 100%;
    height: auto;
    border-radius: 4px;
    margin: 1.5rem 0;
    border: 1px solid var(--theme-border-subtle, rgba(59, 130, 246, 0.2));
  }

  .prose :global(video) {
    max-width: 100%;
    border-radius: 4px;
    margin: 1.5rem 0;
    border: 1px solid var(--theme-border-subtle, rgba(59, 130, 246, 0.2));
  }

  /* === CODE === */
  .prose :global(code) {
    background: var(--theme-bg-elevated, rgba(55, 65, 81, 0.95));
    padding: 0.2rem 0.4rem;
    border-radius: 4px;
    font-size: 0.9em;
    font-family: var(--font-mono, 'Share Tech Mono', monospace);
    color: var(--theme-accent, #f59e0b);
  }

  .prose :global(pre) {
    background: var(--theme-bg-elevated, rgba(55, 65, 81, 0.95));
    padding: 1rem;
    border-radius: 4px;
    overflow-x: auto;
    margin: 1.5rem 0;
    border: 1px solid var(--theme-border-subtle, rgba(59, 130, 246, 0.2));
  }

  .prose :global(pre code) {
    background: none;
    padding: 0;
    color: var(--theme-text-primary, #f3f4f6);
  }

  /* === BLOCKQUOTE - styled as tactical note === */
  .prose :global(blockquote) {
    border-left: 3px solid var(--theme-accent, #f59e0b);
    margin: 1.5rem 0;
    padding: 1rem 1.5rem;
    background: var(--theme-accent-dim, rgba(245, 158, 11, 0.2));
    border-radius: 0 4px 4px 0;
    position: relative;
  }

  .prose :global(blockquote)::before {
    content: '⚡';
    position: absolute;
    left: -0.75rem;
    top: 50%;
    transform: translateY(-50%);
    background: var(--theme-bg-panel, rgba(31, 41, 55, 0.95));
    padding: 0.25rem;
  }

  /* === TEXT EMPHASIS === */
  .prose :global(strong) {
    color: var(--theme-primary, #3b82f6);
    font-weight: 600;
  }

  .prose :global(em) {
    font-style: normal;
    color: var(--theme-secondary, #10b981);
    font-weight: 500;
  }

  .prose :global(a) {
    color: var(--theme-primary, #3b82f6);
    text-decoration: underline;
    text-decoration-color: var(--theme-primary-dim, rgba(59, 130, 246, 0.2));
    text-underline-offset: 2px;
  }

  .prose :global(a:hover) {
    text-decoration-color: var(--theme-primary, #3b82f6);
    text-shadow: var(--theme-glow-primary, 0 0 10px rgba(59, 130, 246, 0.5));
  }

  /* === TABLES - tactical/military style === */
  .prose :global(table) {
    width: 100%;
    border-collapse: collapse;
    margin: 1.5rem 0;
    border: 1px solid var(--theme-border, rgba(59, 130, 246, 0.4));
  }

  .prose :global(th), .prose :global(td) {
    border: 1px solid var(--theme-border-subtle, rgba(59, 130, 246, 0.2));
    padding: 0.75rem 1rem;
    text-align: left;
  }

  .prose :global(th) {
    background: var(--theme-primary-dim, rgba(59, 130, 246, 0.2));
    color: var(--theme-primary, #3b82f6);
    font-weight: 600;
    text-transform: uppercase;
    font-size: 0.8rem;
    letter-spacing: 0.1em;
    border-bottom: 2px solid var(--theme-primary, #3b82f6);
  }

  .prose :global(tr:nth-child(even) td) {
    background: var(--theme-bg-elevated, rgba(55, 65, 81, 0.5));
  }

  .prose :global(tr:hover td) {
    background: var(--theme-primary-dim, rgba(59, 130, 246, 0.15));
  }

  /* === HORIZONTAL RULE === */
  .prose :global(hr) {
    border: none;
    height: 1px;
    background: linear-gradient(
      90deg,
      transparent 0%,
      var(--theme-border, rgba(59, 130, 246, 0.4)) 20%,
      var(--theme-primary, #3b82f6) 50%,
      var(--theme-border, rgba(59, 130, 246, 0.4)) 80%,
      transparent 100%
    );
    margin: 2.5rem 0;
  }
</style>
