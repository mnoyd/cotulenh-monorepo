<script lang="ts">
  import { page } from '$app/stores';
  import { getSubjectById } from '@cotulenh/learn';
  import { ArrowLeft, ArrowRight, BookOpen, Loader2 } from 'lucide-svelte';

  const subjectId = $derived($page.params.subjectId ?? '');
  const subject = $derived(subjectId ? getSubjectById(subjectId) : null);
</script>

<div class="content-page">
  <nav class="content-nav">
    <a href="/learn/{subjectId}" class="back-link">
      <ArrowLeft size={18} />
      <span>Back to {subject?.title ?? 'Subject'}</span>
    </a>
  </nav>

  {#if subject}
    <header class="content-header hud-corners">
      <div class="header-icon">
        <BookOpen size={24} />
      </div>
      <div class="header-text">
        <h1>{subject.title}</h1>
        <p class="subtitle">Introduction & Overview</p>
      </div>
    </header>
  {/if}

  <div class="content-container hud-corners">
    {#await import(`../../../../content/learn/${subjectId}.md`)}
      <div class="loading">
        <Loader2 size={32} class="spinner" />
        <span>Loading content...</span>
      </div>
    {:then module}
      {@const Component = module.default}
      <div class="prose">
        <Component />
      </div>
    {:catch}
      <div class="error">
        <p>Content not found for this subject.</p>
        <a href="/learn/{subjectId}" class="error-link">Return to subject</a>
      </div>
    {/await}
  </div>

  <nav class="bottom-nav">
    <a href="/learn/{subjectId}" class="start-lessons btn-game">
      <span>Start Lessons</span>
      <ArrowRight size={18} />
    </a>
  </nav>
</div>

<style>
  .content-page {
    max-width: 800px;
    margin: 0 auto;
    padding: 1.5rem 1rem 3rem;
  }

  .content-nav {
    margin-bottom: 1.5rem;
  }

  .back-link {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--theme-text-secondary, rgba(229, 231, 235, 0.7));
    text-decoration: none;
    font-size: 0.9rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding: 0.5rem 0;
  }

  .back-link:hover {
    color: var(--theme-primary, #3b82f6);
    text-shadow: var(--theme-glow-primary, 0 0 10px rgba(59, 130, 246, 0.5));
  }

  .content-header {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1.25rem 1.5rem;
    background: var(--theme-bg-panel, rgba(31, 41, 55, 0.95));
    border: 1px solid var(--theme-border-subtle, rgba(59, 130, 246, 0.2));
    border-radius: 4px;
    margin-bottom: 1.5rem;
  }

  .header-icon {
    width: 48px;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--theme-secondary-dim, rgba(16, 185, 129, 0.2));
    border: 1px solid var(--theme-secondary, #10b981);
    border-radius: 4px;
    color: var(--theme-secondary, #10b981);
    flex-shrink: 0;
  }

  .header-text {
    flex: 1;
    min-width: 0;
  }

  .header-text h1 {
    font-size: 1.5rem;
    margin: 0;
    color: var(--theme-primary, #3b82f6);
    text-shadow: var(--theme-glow-primary, 0 0 10px rgba(59, 130, 246, 0.5));
  }

  .subtitle {
    margin: 0.25rem 0 0;
    color: var(--theme-text-secondary, rgba(229, 231, 235, 0.7));
    font-size: 0.9rem;
  }

  .content-container {
    background: var(--theme-bg-panel, rgba(31, 41, 55, 0.95));
    padding: 2rem;
    border-radius: 4px;
    margin-bottom: 2rem;
    border: 1px solid var(--theme-border, rgba(59, 130, 246, 0.4));
    min-height: 200px;
  }

  .loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    padding: 3rem;
    color: var(--theme-text-secondary, rgba(229, 231, 235, 0.7));
  }

  .loading :global(.spinner) {
    animation: spin 1s linear infinite;
    color: var(--theme-primary, #3b82f6);
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  .bottom-nav {
    display: flex;
    justify-content: center;
  }

  .start-lessons {
    display: inline-flex;
    align-items: center;
    gap: 0.75rem;
    background: var(--theme-primary-dim, rgba(59, 130, 246, 0.2));
    color: var(--theme-primary, #3b82f6);
    padding: 0.875rem 1.75rem;
    border-radius: 4px;
    border: 1px solid var(--theme-primary, #3b82f6);
    text-decoration: none;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    font-size: 0.9rem;
  }

  .start-lessons:hover {
    background: var(--theme-primary, #3b82f6);
    color: var(--theme-text-inverse, #111827);
    box-shadow: var(--theme-glow-primary, 0 0 10px rgba(59, 130, 246, 0.5));
  }

  .error {
    text-align: center;
    padding: 3rem 1rem;
    color: var(--theme-text-secondary, rgba(229, 231, 235, 0.7));
  }

  .error p {
    margin: 0 0 1rem;
  }

  .error-link {
    color: var(--theme-primary, #3b82f6);
    text-decoration: underline;
    text-underline-offset: 2px;
  }

  .error-link:hover {
    text-shadow: var(--theme-glow-primary, 0 0 10px rgba(59, 130, 246, 0.5));
  }

  /* === PROSE STYLES === */
  .prose {
    line-height: 1.7;
    color: var(--theme-text-primary, #f3f4f6);
  }

  .prose :global(h1) {
    font-size: 1.75rem;
    margin: 0 0 1.5rem;
    color: var(--theme-primary, #3b82f6);
    font-weight: 700;
    text-shadow: var(--theme-glow-primary, 0 0 10px rgba(59, 130, 246, 0.5));
  }

  .prose :global(h2) {
    font-size: 1.3rem;
    margin: 2rem 0 1rem;
    padding: 0.5rem 0 0.5rem 1rem;
    border-left: 3px solid var(--theme-primary, #3b82f6);
    background: var(--theme-primary-dim, rgba(59, 130, 246, 0.2));
    color: var(--theme-primary, #3b82f6);
    font-weight: 600;
  }

  .prose :global(h3) {
    font-size: 1.1rem;
    margin: 1.5rem 0 0.75rem;
    color: var(--theme-secondary, #10b981);
    font-weight: 600;
  }

  .prose :global(p) {
    margin: 1rem 0;
  }

  .prose :global(ul),
  .prose :global(ol) {
    margin: 1rem 0;
    padding-left: 1.5rem;
  }

  .prose :global(li) {
    margin: 0.5rem 0;
  }

  .prose :global(li::marker) {
    color: var(--theme-primary, #3b82f6);
  }

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
    text-underline-offset: 2px;
  }

  .prose :global(blockquote) {
    border-left: 3px solid var(--theme-accent, #f59e0b);
    margin: 1.5rem 0;
    padding: 1rem 1.25rem;
    background: var(--theme-accent-dim, rgba(245, 158, 11, 0.2));
    border-radius: 0 4px 4px 0;
  }

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

  .prose :global(img) {
    max-width: 100%;
    height: auto;
    border-radius: 4px;
    margin: 1.5rem 0;
    border: 1px solid var(--theme-border-subtle, rgba(59, 130, 246, 0.2));
  }

  /* === RESPONSIVE === */
  @media (max-width: 640px) {
    .content-page {
      padding: 1rem 0.75rem 2rem;
    }

    .content-header {
      flex-direction: column;
      text-align: center;
      padding: 1rem;
      gap: 0.75rem;
    }

    .header-text h1 {
      font-size: 1.25rem;
    }

    .content-container {
      padding: 1.25rem;
      margin-bottom: 1.5rem;
    }

    .prose :global(h1) {
      font-size: 1.4rem;
    }

    .prose :global(h2) {
      font-size: 1.15rem;
      padding: 0.4rem 0 0.4rem 0.75rem;
    }

    .prose :global(h3) {
      font-size: 1rem;
    }

    .prose :global(blockquote) {
      padding: 0.75rem 1rem;
      margin: 1rem 0;
    }

    .start-lessons {
      width: 100%;
      justify-content: center;
      padding: 1rem;
    }
  }
</style>
