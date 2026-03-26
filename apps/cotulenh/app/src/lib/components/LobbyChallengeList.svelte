<script lang="ts">
  import type { InvitationItem } from '$lib/invitations/types';
  import OpenChallengeRow from './OpenChallengeRow.svelte';
  import LobbyEmptyState from './LobbyEmptyState.svelte';

  let {
    challenges,
    currentUserId,
    loading = false,
    loadingAcceptIds = new Set<string>(),
    loadingCancelIds = new Set<string>(),
    onaccept,
    oncancel,
    oncreate
  }: {
    challenges: InvitationItem[];
    currentUserId: string;
    loading?: boolean;
    loadingAcceptIds?: Set<string>;
    loadingCancelIds?: Set<string>;
    onaccept: (id: string) => void;
    oncancel: (id: string) => void;
    oncreate: () => void;
  } = $props();
</script>

{#if loading}
  <!-- Skeleton loading state -->
  <div class="flat-list">
    {#each [1, 2, 3] as _}
      <div class="flat-list-item skeleton-item">
        <span class="skeleton-bar name"></span>
        <span class="skeleton-bar time"></span>
        <span class="skeleton-bar action"></span>
      </div>
    {/each}
  </div>
{:else if challenges.length === 0}
  <LobbyEmptyState {oncreate} />
{:else}
  <div class="flat-list">
    {#each challenges as challenge (challenge.id)}
      <OpenChallengeRow
        {challenge}
        {currentUserId}
        loadingAccept={loadingAcceptIds.has(challenge.id)}
        loadingCancel={loadingCancelIds.has(challenge.id)}
        {onaccept}
        {oncancel}
      />
    {/each}
  </div>
{/if}

<style>
  .skeleton-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.25rem 0;
  }

  .skeleton-bar {
    background: var(--theme-bg-dark, #222);
    border-radius: 2px;
    height: 0.875rem;
    animation: pulse 1.5s ease-in-out infinite;
  }

  .skeleton-bar.name {
    width: 120px;
    flex: 1;
  }

  .skeleton-bar.time {
    width: 40px;
  }

  .skeleton-bar.action {
    width: 60px;
  }

  @keyframes pulse {
    0%, 100% { opacity: 0.4; }
    50% { opacity: 0.7; }
  }
</style>
