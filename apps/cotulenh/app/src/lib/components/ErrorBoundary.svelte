<script lang="ts">
  import { logger } from '@cotulenh/common';

  interface Props {
    fallback?: (error: Error) => any;
    children?: any;
  }

  let { fallback, children }: Props = $props();
  let error = $state<Error | null>(null);

  function handleError(e: ErrorEvent) {
    error = e.error;
    logger.error(e.error, 'Error boundary caught error');
    e.preventDefault();
  }

  $effect(() => {
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  });
</script>

{#if error}
  {#if fallback}
    {@render fallback(error)}
  {:else}
    <div class="error-boundary">
      <div class="error-content">
        <h2>Something went wrong</h2>
        <p>{error.message}</p>
        <button onclick={() => (error = null)}>Try again</button>
        <button onclick={() => window.location.reload()}>Reload page</button>
      </div>
    </div>
  {/if}
{:else}
  {@render children?.()}
{/if}

<style>
  .error-boundary {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 400px;
    padding: 2rem;
  }

  .error-content {
    text-align: center;
    max-width: 500px;
  }

  .error-content h2 {
    color: var(--color-error, #ef4444);
    margin-bottom: 1rem;
  }

  .error-content p {
    margin-bottom: 1.5rem;
    color: var(--color-text-secondary, #6b7280);
  }

  .error-content button {
    margin: 0.5rem;
    padding: 0.5rem 1rem;
    border-radius: 0.375rem;
    border: 1px solid currentColor;
    background: transparent;
    cursor: pointer;
  }

  .error-content button:hover {
    background: var(--color-button-hover, rgba(0, 0, 0, 0.05));
  }
</style>
