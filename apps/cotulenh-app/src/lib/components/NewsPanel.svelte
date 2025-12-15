<script lang="ts">
  import { onMount, onDestroy } from 'svelte';

  const newsItems = [
    "SITREP: COMMANDER CHESS ONLINE",
    "INTEL: ENEMY MOVEMENT DETECTED IN SECTOR 7",
    "UPDATE: NEW DEPLOYMENT PROTOCOLS EFFECTIVE IMMEDIATELY",
    "REMINDER: CHECK YOUR FLANK",
    "SYSTEM: ALL SYSTEMS NOMINAL"
  ];

  let currentItemIndex = 0;
  let interval: any;

  onMount(() => {
    interval = setInterval(() => {
      currentItemIndex = (currentItemIndex + 1) % newsItems.length;
    }, 4000);
  });

  onDestroy(() => {
    if (interval) clearInterval(interval);
  });
</script>

<div class="news-panel">
  <div class="news-label">INTEL FEED //</div>
  <div class="news-content">
    {#key currentItemIndex}
      <span class="news-item">{newsItems[currentItemIndex]}</span>
    {/key}
  </div>
</div>

<style>
  .news-panel {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-xs) var(--spacing-sm);
    background: rgba(0, 0, 0, 0.4);
    border: 1px solid var(--mw-primary-dim);
    border-left: 2px solid var(--mw-primary);
    font-family: var(--font-mono);
    font-size: 0.75rem;
    color: var(--mw-primary);
    overflow: hidden;
    position: relative;
    height: 32px;
  }

  .news-label {
    font-weight: bold;
    color: var(--mw-secondary);
    white-space: nowrap;
    flex-shrink: 0;
  }

  .news-content {
    flex-grow: 1;
    overflow: hidden;
    white-space: nowrap;
    position: relative;
    height: 100%;
    display: flex;
    align-items: center;
  }

  .news-item {
    display: inline-block;
    animation: slideIn 0.5s ease-out;
  }

  @keyframes slideIn {
    from {
      transform: translateY(100%);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }

  /* Scanline/Glitch effect optional */
</style>
