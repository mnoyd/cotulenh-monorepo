<script lang="ts">
  import { getI18n } from '$lib/i18n/index.svelte';

  const i18n = getI18n();

  let { visible }: { visible: boolean } = $props();
</script>

{#if visible}
  <div class="reconnect-banner" role="status">
    <span class="pulse-dot"></span>
    <span class="banner-text">{i18n.t('game.opponentMayReconnect')}</span>
  </div>
{/if}

<style>
  .reconnect-banner {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.375rem 0.75rem;
    background: var(--theme-warning-bg, rgba(245, 158, 11, 0.15));
    border: 1px solid var(--theme-warning, #f59e0b);
    border-radius: 6px;
    color: var(--theme-warning, #f59e0b);
    font-size: 0.75rem;
    font-weight: 600;
    animation: fadeIn 0.2s ease-in;
  }

  .pulse-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--theme-warning, #f59e0b);
    animation: pulse 1.5s ease-in-out infinite;
    flex-shrink: 0;
  }

  .banner-text {
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.3; }
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
</style>
