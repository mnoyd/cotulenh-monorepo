<script lang="ts">
  import { getI18n } from '$lib/i18n/index.svelte';
  import { Home, ArrowLeft } from 'lucide-svelte';

  const i18n = getI18n();
</script>

<main class="error-page">
  <div class="error-container">
    <div class="error-code">404</div>
    <h1>{i18n.t('error.pageNotFound')}</h1>
    <p>{i18n.t('error.pageNotFoundDesc')}</p>

    <div class="error-actions">
      <a href="/" class="action-button primary">
        <Home size={18} />
        <span>{i18n.t('error.goHome')}</span>
      </a>
      <button class="action-button secondary" onclick={() => history.back()}>
        <ArrowLeft size={18} />
        <span>{i18n.t('error.goBack')}</span>
      </button>
    </div>
  </div>
</main>

<style>
  .error-page {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--theme-bg-dark, #000);
    color: var(--theme-text-primary, #eee);
    font-family: var(--font-ui);
    padding: 2rem;
  }

  .error-container {
    text-align: center;
    max-width: 400px;
  }

  .error-code {
    font-size: 6rem;
    font-weight: 800;
    color: #22c55e;
    line-height: 1;
    margin-bottom: 1rem;
    font-family: var(--font-mono);
  }

  h1 {
    font-size: 1.5rem;
    margin: 0 0 0.75rem 0;
    font-weight: 600;
  }

  p {
    color: var(--theme-text-secondary, #aaa);
    margin: 0 0 2rem 0;
  }

  .error-actions {
    display: flex;
    gap: 1rem;
    justify-content: center;
    flex-wrap: wrap;
  }

  .action-button {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1.5rem;
    border-radius: 8px;
    font-weight: 600;
    text-decoration: none;
    font-size: 0.9rem;
    cursor: pointer;
    border: none;
  }

  .action-button.primary {
    background: #22c55e;
    color: #000;
  }

  .action-button.primary:hover {
    background: #16a34a;
  }

  .action-button.secondary {
    background: transparent;
    color: #06b6d4;
    border: 1px solid #06b6d4;
  }

  .action-button.secondary:hover {
    background: rgba(6, 182, 212, 0.1);
  }
</style>
