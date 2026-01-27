<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    title?: string;
    description?: string;
    children: Snippet;
  }

  let { title, description, children }: Props = $props();
</script>

<article class="learn-content">
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
  }

  .content-header {
    margin-bottom: 2rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid var(--border);
  }

  .content-header h1 {
    font-size: 2rem;
    margin: 0 0 0.5rem;
  }

  .description {
    color: var(--text-secondary);
    font-size: 1.1rem;
    margin: 0;
  }

  .prose {
    line-height: 1.7;
  }

  .prose :global(h2) {
    font-size: 1.5rem;
    margin: 2rem 0 1rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid var(--border);
  }

  .prose :global(h3) {
    font-size: 1.25rem;
    margin: 1.5rem 0 0.75rem;
  }

  .prose :global(p) {
    margin: 1rem 0;
  }

  .prose :global(ul), .prose :global(ol) {
    margin: 1rem 0;
    padding-left: 1.5rem;
  }

  .prose :global(li) {
    margin: 0.5rem 0;
  }

  .prose :global(img) {
    max-width: 100%;
    height: auto;
    border-radius: 8px;
    margin: 1.5rem 0;
  }

  .prose :global(video) {
    max-width: 100%;
    border-radius: 8px;
    margin: 1.5rem 0;
  }

  .prose :global(code) {
    background: var(--surface-2);
    padding: 0.2rem 0.4rem;
    border-radius: 4px;
    font-size: 0.9em;
  }

  .prose :global(pre) {
    background: var(--surface-2);
    padding: 1rem;
    border-radius: 8px;
    overflow-x: auto;
    margin: 1.5rem 0;
  }

  .prose :global(pre code) {
    background: none;
    padding: 0;
  }

  .prose :global(blockquote) {
    border-left: 4px solid var(--primary);
    margin: 1.5rem 0;
    padding: 0.5rem 1rem;
    background: var(--surface-1);
    border-radius: 0 8px 8px 0;
  }

  .prose :global(strong) {
    color: var(--text-primary);
    font-weight: 600;
  }

  .prose :global(a) {
    color: var(--primary);
    text-decoration: underline;
  }

  .prose :global(a:hover) {
    opacity: 0.8;
  }

  .prose :global(table) {
    width: 100%;
    border-collapse: collapse;
    margin: 1.5rem 0;
  }

  .prose :global(th), .prose :global(td) {
    border: 1px solid var(--border);
    padding: 0.75rem;
    text-align: left;
  }

  .prose :global(th) {
    background: var(--surface-1);
    font-weight: 600;
  }

  .prose :global(hr) {
    border: none;
    border-top: 1px solid var(--border);
    margin: 2rem 0;
  }
</style>
