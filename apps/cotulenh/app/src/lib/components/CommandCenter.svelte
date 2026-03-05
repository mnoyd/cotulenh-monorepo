<script lang="ts">
  import { browser } from '$app/environment';
  import type { Snippet } from 'svelte';
  import TabPanel from './TabPanel.svelte';
  import '$lib/styles/command-center.css';

  interface Tab {
    id: string;
    label: string;
    content: Snippet;
  }

  interface Props {
    center: Snippet;
    tabs?: Tab[];
  }

  let { center, tabs = [] }: Props = $props();

  let mobileOverlayOpen = $state(false);
  let hasTabs = $derived(tabs.length > 0);
</script>

<div class="command-center" class:has-right-panel={hasTabs}>
  <div class="center-area">
    {@render center()}
  </div>

  {#if hasTabs}
    <aside class="right-panel max-md:hidden">
      <TabPanel {tabs} />
    </aside>

    {#if browser}
      <button
        class="mobile-panel-toggle hidden max-md:flex"
        onclick={() => (mobileOverlayOpen = true)}
        aria-label="Open panel"
      >
        ≡
      </button>
    {/if}

    {#if mobileOverlayOpen}
      <div class="mobile-panel-overlay" role="dialog" aria-modal="true">
        <div class="mobile-panel-header">
          <button
            class="mobile-panel-close"
            onclick={() => (mobileOverlayOpen = false)}
            aria-label="Close panel"
          >
            ×
          </button>
        </div>
        <div class="mobile-panel-content">
          <TabPanel {tabs} />
        </div>
      </div>
    {/if}
  {/if}
</div>

<style>
  .command-center {
    display: grid;
    grid-template-columns: 1fr;
    min-height: 100vh;
    width: 100%;
  }

  .command-center.has-right-panel {
    grid-template-columns: 1fr 320px;
  }

  .center-area {
    min-width: 0;
    min-height: 0;
    display: flex;
    flex-direction: column;
    padding: 0.75rem;
  }

  .right-panel {
    display: flex;
    flex-direction: column;
    border-left: 1px solid var(--theme-border, #333);
    background: var(--theme-bg-panel, #1a1a1a);
    min-height: 0;
    overflow: hidden;
  }

  .mobile-panel-toggle {
    position: fixed;
    top: 0.75rem;
    right: 0.75rem;
    z-index: 140;
    width: 36px;
    height: 36px;
    background: var(--theme-bg-panel, #1a1a1a);
    border: 1px solid var(--theme-border, #333);
    color: var(--theme-text-secondary, #aaa);
    font-size: 1.25rem;
    cursor: pointer;
    display: none;
    align-items: center;
    justify-content: center;
    padding: 0;
  }

  .mobile-panel-toggle:hover {
    color: var(--theme-primary, #06b6d4);
  }

  .mobile-panel-overlay {
    position: fixed;
    inset: 0;
    z-index: 200;
    background: var(--theme-bg-dark, #111);
    display: flex;
    flex-direction: column;
  }

  .mobile-panel-header {
    display: flex;
    padding: 0.5rem;
    border-bottom: 1px solid var(--theme-border, #333);
    flex-shrink: 0;
  }

  .mobile-panel-close {
    width: 36px;
    height: 36px;
    background: none;
    border: 1px solid var(--theme-border, #333);
    color: var(--theme-text-secondary, #aaa);
    font-size: 1.25rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
  }

  .mobile-panel-close:hover {
    color: var(--theme-primary, #06b6d4);
  }

  .mobile-panel-content {
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }

  @media (max-width: 768px) {
    .command-center.has-right-panel {
      grid-template-columns: 1fr;
    }

    .right-panel {
      display: none;
    }

    .mobile-panel-toggle {
      display: flex;
    }
  }
</style>
