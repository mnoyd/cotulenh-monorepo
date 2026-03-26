<script lang="ts">
  import { goto } from '$app/navigation';
  import { getI18n } from '$lib/i18n/index.svelte';

  const i18n = getI18n();

  let { oncreate }: { oncreate: () => void } = $props();

  function startPractice() {
    goto('/play/practice');
  }
</script>

<div class="empty-state">
  <p class="empty-text">{i18n.t('lobby.noOpenChallenges')}</p>
  <div class="empty-actions">
    <button class="text-link" onclick={oncreate}>
      {i18n.t('lobby.createGame')}
    </button>
    <button class="text-link" onclick={startPractice}>
      {i18n.t('lobby.playAI')}
    </button>
  </div>
</div>

<style>
  .empty-state {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 0.5rem 0;
  }

  .empty-text {
    color: var(--theme-text-secondary, #666);
    font-size: 0.8125rem;
    margin: 0;
  }

  .empty-actions {
    display: flex;
    gap: 1rem;
  }
</style>
