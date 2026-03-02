<script lang="ts">
  import { goto } from '$app/navigation';
  import { getI18n } from '$lib/i18n/index.svelte';
  import { getOnlineUsers } from '$lib/friends/presence.svelte';
  import type { GameConfig, InvitationItem } from '$lib/invitations/types';
  import { TIME_PRESETS } from '$lib/invitations/types';
  import type { FriendListItem } from '$lib/friends/types';
  import { onInvitationRealtimeEvent } from '$lib/invitations/realtime.svelte';
  import type { InvitationRealtimeEvent } from '$lib/invitations/realtime.svelte';
  import PlayerCard from '$lib/components/PlayerCard.svelte';
  import TimeControlSelector from '$lib/components/TimeControlSelector.svelte';
  import InvitationCard from '$lib/components/InvitationCard.svelte';
  import ReceivedInvitationCard from '$lib/components/ReceivedInvitationCard.svelte';
  import { Loader2, Users } from 'lucide-svelte';
  import Button from '$lib/components/ui/button/button.svelte';
  import { toast } from 'svelte-sonner';
  import type { PageData } from './$types';

  const i18n = getI18n();

  let { data }: { data: PageData } = $props();

  // Time control state — default to first preset (5+0)
  let selectedConfig = $state<GameConfig>({ ...TIME_PRESETS[0].config });

  // Optimistic states
  let optimisticInvited = $state(new Set<string>());
  let removedSentInvitations = $state(new Set<string>());
  let removedReceivedInvitations = $state(new Set<string>());
  let loadingSend = $state(new Set<string>());
  let loadingCancel = $state(new Set<string>());
  let loadingAccept = $state(new Set<string>());
  let loadingDecline = $state(new Set<string>());

  // Realtime received invitations (new ones that arrive after page load)
  let realtimeReceivedInvitations = $state<InvitationItem[]>([]);

  // Get online users from presence (reactive)
  let onlineUsers = $derived(getOnlineUsers());

  // Filter friends to only show online ones
  let onlineFriends = $derived(
    data.friends.filter((f: FriendListItem) => onlineUsers.has(f.userId))
  );

  // Build set of user IDs that already have pending invitations from us
  let pendingToUserIds = $derived.by(() => {
    const ids = new Set<string>();
    for (const inv of data.sentInvitations) {
      if (inv.toUser && !removedSentInvitations.has(inv.id)) {
        ids.add(inv.toUser.id);
      }
    }
    for (const id of optimisticInvited) {
      ids.add(id);
    }
    return ids;
  });

  // Visible sent invitations
  let visibleSentInvitations = $derived(
    data.sentInvitations.filter((inv: InvitationItem) => !removedSentInvitations.has(inv.id))
  );

  // Visible received invitations — combine server data + realtime arrivals, minus removed
  let visibleReceivedInvitations = $derived.by(() => {
    const serverReceived = data.receivedInvitations.filter(
      (inv: InvitationItem) => !removedReceivedInvitations.has(inv.id)
    );
    const realtimeReceived = realtimeReceivedInvitations.filter(
      (inv) => !removedReceivedInvitations.has(inv.id)
    );
    // Deduplicate by ID (realtime might duplicate server data)
    const seen = new Set<string>();
    const result: InvitationItem[] = [];
    for (const inv of [...serverReceived, ...realtimeReceived]) {
      if (!seen.has(inv.id)) {
        seen.add(inv.id);
        result.push(inv);
      }
    }
    return result;
  });

  // Listen for realtime invitation events on this page
  $effect(() => {
    const unsub = onInvitationRealtimeEvent((event: InvitationRealtimeEvent) => {
      if (event.type === 'received') {
        // Add to realtime received list — display name will show as loading briefly
        realtimeReceivedInvitations = [
          ...realtimeReceivedInvitations,
          {
            id: event.id,
            fromUser: { id: event.fromUser, displayName: '' },
            toUser: null,
            gameConfig: event.gameConfig,
            inviteCode: event.inviteCode,
            status: 'pending',
            createdAt: event.createdAt
          }
        ];
      } else if (event.type === 'statusChanged') {
        // A sent invitation was accepted/declined — remove from sent list
        removedSentInvitations = new Set([...removedSentInvitations, event.id]);
      } else if (event.type === 'deleted') {
        // A received invitation was cancelled by sender — remove
        removedReceivedInvitations = new Set([...removedReceivedInvitations, event.id]);
      }
    });

    return unsub;
  });

  async function postAction(action: string, body: Record<string, string>): Promise<Response> {
    return fetch(`?/${action}`, {
      method: 'POST',
      body: new URLSearchParams(body),
      headers: { 'x-sveltekit-action': 'true' }
    });
  }

  async function handleInvite(friendUserId: string) {
    // Optimistic: mark as invited immediately
    optimisticInvited = new Set([...optimisticInvited, friendUserId]);
    loadingSend = new Set([...loadingSend, friendUserId]);

    try {
      const response = await postAction('sendInvitation', {
        toUserId: friendUserId,
        gameConfig: JSON.stringify(selectedConfig)
      });

      if (!response.ok) {
        const next = new Set(optimisticInvited);
        next.delete(friendUserId);
        optimisticInvited = next;
        toast.error(i18n.t('invitation.toast.sendFailed'));
        return;
      }

      toast.success(i18n.t('invitation.toast.sent'), { duration: 4000 });
    } catch {
      const next = new Set(optimisticInvited);
      next.delete(friendUserId);
      optimisticInvited = next;
      toast.error(i18n.t('invitation.toast.sendFailed'));
    } finally {
      const next = new Set(loadingSend);
      next.delete(friendUserId);
      loadingSend = next;
    }
  }

  async function handleCancel(invitationId: string) {
    loadingCancel = new Set([...loadingCancel, invitationId]);

    try {
      const response = await postAction('cancelInvitation', { invitationId });

      if (!response.ok) {
        toast.error(i18n.t('invitation.toast.cancelFailed'));
        return;
      }

      // Find the invitation to remove its toUser from optimistic set
      const inv = data.sentInvitations.find((i: InvitationItem) => i.id === invitationId);
      if (inv?.toUser) {
        const next = new Set(optimisticInvited);
        next.delete(inv.toUser.id);
        optimisticInvited = next;
      }

      removedSentInvitations = new Set([...removedSentInvitations, invitationId]);
      toast.success(i18n.t('invitation.toast.cancelled'), { duration: 4000 });
    } catch {
      toast.error(i18n.t('invitation.toast.cancelFailed'));
    } finally {
      const next = new Set(loadingCancel);
      next.delete(invitationId);
      loadingCancel = next;
    }
  }

  async function handleAccept(invitationId: string) {
    loadingAccept = new Set([...loadingAccept, invitationId]);

    try {
      const response = await postAction('acceptInvitation', { invitationId });

      if (!response.ok) {
        toast.error(i18n.t('invitation.toast.acceptFailed'));
        return;
      }

      // Parse response to get gameId
      const result = await response.json();
      // SvelteKit action responses use a specific format
      const parsed = typeof result?.data === 'string' ? JSON.parse(result.data) : result;
      const gameId = parsed?.[1]?.gameId ?? parsed?.gameId;

      removedReceivedInvitations = new Set([...removedReceivedInvitations, invitationId]);
      toast.success(i18n.t('invitation.toast.acceptSuccess'), { duration: 4000 });

      if (gameId) {
        goto(`/play/online/${gameId}`);
      }
    } catch {
      toast.error(i18n.t('invitation.toast.acceptFailed'));
    } finally {
      const next = new Set(loadingAccept);
      next.delete(invitationId);
      loadingAccept = next;
    }
  }

  async function handleDecline(invitationId: string) {
    loadingDecline = new Set([...loadingDecline, invitationId]);

    try {
      const response = await postAction('declineInvitation', { invitationId });

      if (!response.ok) {
        toast.error(i18n.t('invitation.toast.declineFailed'));
        return;
      }

      removedReceivedInvitations = new Set([...removedReceivedInvitations, invitationId]);
      toast.success(i18n.t('invitation.toast.declineSuccess'), { duration: 4000 });
    } catch {
      toast.error(i18n.t('invitation.toast.declineFailed'));
    } finally {
      const next = new Set(loadingDecline);
      next.delete(invitationId);
      loadingDecline = next;
    }
  }

  function handleTimeSelect(config: GameConfig) {
    selectedConfig = config;
  }
</script>

<svelte:head>
  <title>{i18n.t('invitation.pageTitle')} | {i18n.t('nav.appName')}</title>
</svelte:head>

<div class="online-page">
  <div class="online-container">
    <h1 class="page-title">{i18n.t('invitation.pageTitle')}</h1>

    <!-- Received Invitations (AC2, AC3, AC4) -->
    {#if visibleReceivedInvitations.length > 0}
      <section class="section" aria-labelledby="received-invitations-heading">
        <h2 id="received-invitations-heading" class="section-title">
          {i18n.t('invitation.received.title')} ({visibleReceivedInvitations.length})
        </h2>
        <div class="invitations-list">
          {#each visibleReceivedInvitations as invitation (invitation.id)}
            <ReceivedInvitationCard
              {invitation}
              loadingAccept={loadingAccept.has(invitation.id)}
              loadingDecline={loadingDecline.has(invitation.id)}
              onaccept={handleAccept}
              ondecline={handleDecline}
            />
          {/each}
        </div>
      </section>
    {/if}

    <!-- Time Control Selector (AC2) -->
    <section class="section" aria-label={i18n.t('invitation.timeControl.title')}>
      <TimeControlSelector {selectedConfig} onselect={handleTimeSelect} />
    </section>

    <!-- Online Friends (AC1, AC3, AC4) -->
    <section class="section" aria-labelledby="online-friends-heading">
      <h2 id="online-friends-heading" class="section-title">
        {i18n.t('invitation.onlineFriends.title')} ({onlineFriends.length})
      </h2>

      {#if onlineFriends.length === 0}
        <div class="empty-state">
          <Users size={40} class="empty-icon" />
          <p class="empty-text">{i18n.t('invitation.onlineFriends.empty')}</p>
          <a href="/user/friends" class="empty-link">
            {i18n.t('invitation.onlineFriends.emptyLink')}
          </a>
        </div>
      {:else}
        <div class="friends-grid">
          {#each onlineFriends as friend (friend.friendshipId)}
            {@const isInvited = pendingToUserIds.has(friend.userId)}
            {@const isSending = loadingSend.has(friend.userId)}
            <PlayerCard
              displayName={friend.displayName}
              online={true}
              showOnlineIndicator={true}
            >
              <Button
                size="sm"
                disabled={isInvited || isSending}
                class="invite-btn"
                onclick={() => handleInvite(friend.userId)}
                aria-label="{isInvited ? i18n.t('invitation.action.invited') : i18n.t('invitation.action.invite')} {friend.displayName}"
              >
                {#if isSending}
                  <Loader2 size={14} class="animate-spin" />
                {/if}
                {isInvited ? i18n.t('invitation.action.invited') : i18n.t('invitation.action.invite')}
              </Button>
            </PlayerCard>
          {/each}
        </div>
      {/if}
    </section>

    <!-- Sent Invitations (AC5, AC6) -->
    {#if visibleSentInvitations.length > 0}
      <section class="section" aria-labelledby="sent-invitations-heading">
        <h2 id="sent-invitations-heading" class="section-title">
          {i18n.t('invitation.sent.title')} ({visibleSentInvitations.length})
        </h2>
        <div class="invitations-list">
          {#each visibleSentInvitations as invitation (invitation.id)}
            <InvitationCard
              {invitation}
              loading={loadingCancel.has(invitation.id)}
              oncancel={handleCancel}
            />
          {/each}
        </div>
      </section>
    {/if}
  </div>
</div>

<!-- Screen reader announcements -->
<div class="sr-only" aria-live="polite" aria-atomic="true"></div>

<style>
  .online-page {
    display: flex;
    justify-content: center;
    padding: 2rem 1rem;
    min-height: 100vh;
  }

  .online-container {
    width: 100%;
    max-width: 800px;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .page-title {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--theme-text-primary, #eee);
    margin: 0;
  }

  .section {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .section-title {
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--theme-text-secondary, #aaa);
    margin: 0;
  }

  .friends-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 0.5rem;
  }

  .invitations-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  /* Empty state */
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    padding: 2rem 1rem;
    text-align: center;
  }

  :global(.empty-icon) {
    color: var(--theme-text-secondary, #666);
  }

  .empty-text {
    font-size: 0.875rem;
    color: var(--theme-text-secondary, #aaa);
    margin: 0;
  }

  .empty-link {
    font-size: 0.875rem;
    color: var(--theme-primary, #06b6d4);
    text-decoration: none;
  }

  .empty-link:hover {
    text-decoration: underline;
  }

  .empty-link:focus-visible {
    outline: 2px solid var(--theme-primary, #06b6d4);
    outline-offset: 2px;
    border-radius: 4px;
  }

  /* Invite button */
  :global(.invite-btn) {
    min-height: 44px;
    min-width: 44px;
  }

  /* Responsive */
  @media (min-width: 768px) {
    .friends-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (max-width: 767px) {
    .online-page {
      padding: 1rem 0.5rem;
    }
  }

  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border-width: 0;
  }

  :global(.animate-spin) {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
</style>
