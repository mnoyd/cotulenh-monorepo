<script lang="ts">
  import { getI18n } from '$lib/i18n/index.svelte';

  const i18n = getI18n();

  type Props = {
    visible: boolean;
    mode: 'self' | 'opponent';
    remainingSeconds?: number;
    timedOut?: boolean;
  };

  let {
    visible,
    mode,
    remainingSeconds = 60,
    timedOut = false
  }: Props = $props();

  let opponentCountdownText = $derived.by(() =>
    i18n.t('game.opponentReconnectCountdown').replace('{seconds}', String(remainingSeconds))
  );
</script>

{#if visible}
  <div
    class="reconnect-banner"
    class:self-mode={mode === 'self'}
    class:timeout-mode={timedOut}
    role="alert"
  >
    <span class="pulse-dot"></span>
    <span class="banner-text">
      {#if mode === 'self'}
        {i18n.t('game.reconnecting')}
      {:else if timedOut}
        {i18n.t('game.opponentDisconnectForfeit')}
      {:else}
        {opponentCountdownText}
      {/if}
    </span>
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
    letter-spacing: 0.03em;
  }

  .self-mode {
    background: rgba(239, 68, 68, 0.12);
    border-color: #ef4444;
    color: #ef4444;
  }

  .self-mode .pulse-dot {
    background: #ef4444;
  }

  .timeout-mode {
    background: rgba(16, 185, 129, 0.14);
    border-color: #10b981;
    color: #10b981;
  }

  .timeout-mode .pulse-dot {
    background: #10b981;
    animation: none;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.3; }
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @media (prefers-reduced-motion: reduce) {
    .reconnect-banner,
    .pulse-dot {
      animation: none;
    }
  }
</style>
