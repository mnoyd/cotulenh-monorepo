<script lang="ts">
  import { BookOpen } from 'lucide-svelte';
  import CategoryCard from '$lib/learn/components/CategoryCard.svelte';
  import { categories } from '$lib/learn/lessons';
</script>

<main class="learn-page">
  <div class="learn-container">
    <header class="learn-header">
      <div class="header-icon">
        <BookOpen size={32} />
      </div>
      <div class="header-content">
        <h1>
          <span class="title-green">Learn</span>
          <span class="title-cyan">Cờ Tư Lệnh</span>
        </h1>
        <p class="tagline">Master Commander Chess step by step with interactive lessons</p>
      </div>
    </header>

    <div class="categories">
      {#each categories as category}
        <CategoryCard {category} />
      {/each}
    </div>

    <div class="back-link">
      <a href="/">← Back to Home</a>
    </div>
  </div>
</main>

<style>
  .learn-page {
    min-height: 100vh;
    background: var(--theme-bg-dark, #000);
    color: var(--theme-text-primary, #eee);
    font-family: var(--font-ui);
    padding: 2rem 1rem;
  }

  .learn-container {
    width: 100%;
    max-width: 900px;
    margin: 0 auto;
  }

  .learn-header {
    display: flex;
    align-items: center;
    gap: 1.5rem;
    margin-bottom: 2rem;
    padding-bottom: 1.5rem;
    border-bottom: 1px solid var(--theme-border, #444);
  }

  .header-icon {
    width: 64px;
    height: 64px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--theme-bg-elevated, #333);
    border-radius: 12px;
    color: var(--theme-success, #22c55e);
  }

  .header-content h1 {
    font-size: 2rem;
    margin: 0;
    font-weight: 800;
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }

  .title-green {
    color: #22c55e;
  }

  .title-cyan {
    color: #06b6d4;
    font-weight: 300;
  }

  .tagline {
    font-size: 1rem;
    color: var(--theme-text-secondary, #aaa);
    margin: 0.5rem 0 0;
  }

  .categories {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .back-link {
    margin-top: 2rem;
    text-align: center;
  }

  .back-link a {
    color: var(--theme-text-secondary, #aaa);
    text-decoration: none;
    font-size: 0.875rem;
  }

  .back-link a:hover {
    color: var(--theme-primary, #06b6d4);
  }

  @media (max-width: 640px) {
    .learn-header {
      flex-direction: column;
      text-align: center;
    }

    .header-content h1 {
      font-size: 1.5rem;
    }
  }
</style>
