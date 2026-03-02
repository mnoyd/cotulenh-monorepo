<script lang="ts">
  import type { Snippet } from 'svelte';
  import OnlineIndicator from './OnlineIndicator.svelte';

  interface Props {
    displayName: string;
    online?: boolean;
    showOnlineIndicator?: boolean;
    children?: Snippet;
  }

  let { displayName, online = false, showOnlineIndicator = false, children }: Props = $props();

  let initial = $derived(displayName ? displayName.charAt(0).toUpperCase() : '?');
</script>

<div class="player-card">
  <div class="player-avatar-wrapper">
    <span class="player-avatar" aria-hidden="true">{initial}</span>
    {#if showOnlineIndicator}
      <span class="indicator-badge">
        <OnlineIndicator {online} visible={online} />
      </span>
    {/if}
  </div>
  <span class="player-name">{displayName}</span>
  {#if children}
    <div class="player-actions">
      {@render children()}
    </div>
  {/if}
</div>

<style>
  .player-card {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem;
    border-radius: 8px;
    background: var(--theme-bg-panel, #222);
    border: 1px solid var(--theme-border, #444);
    min-height: 44px;
  }

  .player-avatar-wrapper {
    position: relative;
    flex-shrink: 0;
  }

  .player-avatar {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: var(--theme-primary, #06b6d4);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.875rem;
    font-weight: 700;
    font-family: var(--font-mono);
    flex-shrink: 0;
  }

  .indicator-badge {
    position: absolute;
    bottom: -2px;
    right: -2px;
    display: flex;
  }

  .player-name {
    flex: 1;
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--theme-text-primary, #eee);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .player-actions {
    display: flex;
    gap: 0.5rem;
    flex-shrink: 0;
  }
</style>
