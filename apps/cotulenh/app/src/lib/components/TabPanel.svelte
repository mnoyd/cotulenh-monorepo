<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Tab {
    id: string;
    label: string;
    content: Snippet;
  }

  interface Props {
    tabs: Tab[];
    activeTab?: string;
  }

  let { tabs, activeTab = $bindable(tabs[0]?.id ?? '') }: Props = $props();
</script>

<div class="tab-panel">
  {#if tabs.length > 1}
    <div class="tab-bar">
      {#each tabs as tab}
        <button
          class="tab-button"
          class:active={activeTab === tab.id}
          onclick={() => (activeTab = tab.id)}
        >
          {tab.label}
        </button>
      {/each}
    </div>
  {/if}

  <div class="tab-content">
    {#each tabs as tab}
      {#if activeTab === tab.id}
        {@render tab.content()}
      {/if}
    {/each}
  </div>
</div>

<style>
  .tab-panel {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
  }

  .tab-bar {
    display: flex;
    border-bottom: 1px solid var(--theme-border, #333);
    flex-shrink: 0;
  }

  .tab-button {
    padding: 0.5rem 0.75rem;
    background: none;
    border: none;
    border-bottom: 2px solid transparent;
    color: var(--theme-text-secondary, #aaa);
    font-family: var(--font-mono);
    font-size: 0.6875rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    cursor: pointer;
  }

  .tab-button:hover {
    color: var(--theme-primary, #06b6d4);
  }

  .tab-button.active {
    color: var(--theme-text-primary, #eee);
    border-bottom-color: var(--theme-primary, #06b6d4);
  }

  .tab-content {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: 0.75rem;
  }
</style>
