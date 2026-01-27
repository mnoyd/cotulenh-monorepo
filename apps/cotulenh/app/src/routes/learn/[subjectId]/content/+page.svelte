<script lang="ts">
  import { page } from '$app/stores';
  import { ArrowLeft, ArrowRight } from 'lucide-svelte';

  const subjectId = $derived($page.params.subjectId ?? '');
</script>

<div class="content-page">
  <nav class="content-nav">
    <a href="/learn/{subjectId}" class="back-link">
      <ArrowLeft size={20} />
      Back to lessons
    </a>
  </nav>

  <div class="content-container">
    {#await import(`../../../../content/learn/${subjectId}.md`) then module}
      {@const Component = module.default}
      <Component />
    {:catch}
      <div class="error">
        <p>Content not found for this subject.</p>
        <a href="/learn/{subjectId}">Return to subject</a>
      </div>
    {/await}
  </div>

  <nav class="bottom-nav">
    <a href="/learn/{subjectId}" class="start-lessons">
      Start Lessons
      <ArrowRight size={20} />
    </a>
  </nav>
</div>

<style>
  .content-page {
    max-width: 900px;
    margin: 0 auto;
    padding: 2rem 1rem;
  }

  .content-nav {
    margin-bottom: 2rem;
  }

  .back-link {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--text-secondary);
    text-decoration: none;
  }

  .back-link:hover {
    color: var(--primary);
  }

  .content-container {
    background: var(--surface-1);
    padding: 2rem;
    border-radius: 12px;
    margin-bottom: 2rem;
  }

  .bottom-nav {
    display: flex;
    justify-content: center;
  }

  .start-lessons {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    background: var(--primary);
    color: white;
    padding: 1rem 2rem;
    border-radius: 8px;
    text-decoration: none;
    font-weight: 600;
    transition: opacity 0.2s;
  }

  .start-lessons:hover {
    opacity: 0.9;
  }

  .error {
    text-align: center;
    padding: 3rem;
    color: var(--text-secondary);
  }

  .error a {
    color: var(--primary);
  }
</style>
