<script lang="ts">
  import { getI18n } from '$lib/i18n/index.svelte';

  interface Props {
    online: boolean;
    visible?: boolean;
  }

  let { online, visible = true }: Props = $props();

  const i18n = getI18n();

  let label = $derived(online ? i18n.t('friends.status.online') : i18n.t('friends.status.offline'));
</script>

{#if visible}
  <span
    class="online-indicator"
    class:online
    role="status"
    aria-label={label}
  >
  </span>
{/if}

<style>
  .online-indicator {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: var(--theme-text-secondary, #666);
    flex-shrink: 0;
  }

  .online-indicator.online {
    background: var(--color-player-online, #22c55e);
  }
</style>
