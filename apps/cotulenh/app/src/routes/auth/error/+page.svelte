<script lang="ts">
  import { getI18n } from '$lib/i18n/index.svelte';
  import { AlertCircle } from 'lucide-svelte';
  import Button from '$lib/components/ui/button/button.svelte';

  const i18n = getI18n();
</script>

<div class="error-page">
  <div class="error-card">
    <div class="error-icon">
      <AlertCircle size={48} />
    </div>
    <h1 class="error-title">{i18n.t('auth.error.title')}</h1>
    <p class="error-desc">{i18n.t('auth.error.description')}</p>
    <Button href="/" variant="outline" size="lg">
      {i18n.t('auth.error.backHome')}
    </Button>
  </div>
</div>

<style>
  .error-page {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    padding: 1rem;
  }

  .error-card {
    text-align: center;
    max-width: 400px;
    padding: 2rem;
    background: var(--theme-bg-panel, #222);
    border: 1px solid var(--theme-border, #444);
    border-radius: 12px;
  }

  .error-icon {
    color: #ef4444;
    margin-bottom: 1rem;
  }

  .error-title {
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--theme-text-primary, #eee);
    margin: 0 0 0.5rem;
  }

  .error-desc {
    font-size: 0.875rem;
    color: var(--theme-text-secondary, #aaa);
    margin: 0 0 1.5rem;
    line-height: 1.5;
  }
</style>
