<script lang="ts">
  import { deserialize } from '$app/forms';
  import { goto, invalidateAll } from '$app/navigation';
  import { page } from '$app/stores';
  import { getI18n } from '$lib/i18n/index.svelte';
  import { getOnlineUsers } from '$lib/friends/presence.svelte';
  import type { GameConfig, InvitationItem } from '$lib/invitations/types';
  import { TIME_PRESETS } from '$lib/invitations/types';
  import { sanitizeName } from '$lib/invitations/queries';
  import type { FriendListItem } from '$lib/friends/types';
  import {
    onInvitationRealtimeEvent,
    subscribeToInvitations,
    unsubscribeFromInvitations
  } from '$lib/invitations/realtime.svelte';
  import type { InvitationRealtimeEvent } from '$lib/invitations/realtime.svelte';
  import { onLobbyRealtimeEvent } from '$lib/invitations/lobby-realtime.svelte';
  import { subscribeToLobby, unsubscribeFromLobby } from '$lib/invitations/lobby-realtime.svelte';
  import type { LobbyChallengeEvent } from '$lib/invitations/lobby-realtime.svelte';
  import LobbyChallengeList from '$lib/components/LobbyChallengeList.svelte';
  import CommandCenter from '$lib/components/CommandCenter.svelte';
  import {
    clearMyActiveChallenge,
    hydrateLobbyChallenges,
    resolveLobbyHydration,
    shouldNavigateOnAcceptedSentInvitation
  } from './lobby-state';
  import { toast } from 'svelte-sonner';
  import { onMount, onDestroy } from 'svelte';
  import '$lib/styles/command-center.css';
  import type { PageData } from './$types';

  const i18n = getI18n();

  let { data }: { data: PageData } = $props();

  // Time control state — default to first preset (5+0)
  let selectedConfig = $state<GameConfig>({ ...TIME_PRESETS[0].config });
  let selectedPresetIndex = $state(0);
  let openChallengeRated = $state(false);
  let lobbyHydrationVersion = 0;

  onMount(() => {
    const params = $page.url.searchParams;
    const minutes = params.get('timeMinutes');
    const increment = params.get('incrementSeconds');

    if (minutes && increment) {
      const m = parseInt(minutes, 10);
      const s = parseInt(increment, 10);
      const matchIndex = TIME_PRESETS.findIndex(
        (p) => p.config.timeMinutes === m && p.config.incrementSeconds === s
      );
      if (matchIndex !== -1) {
        selectedPresetIndex = matchIndex;
        selectedConfig = { ...TIME_PRESETS[matchIndex].config };
      } else {
        selectedConfig = { timeMinutes: m, incrementSeconds: s };
        selectedPresetIndex = -1;
      }
    }

    // Subscribe to lobby realtime
    subscribeToLobby($page.data.supabase);
    const userId = $page.data.session?.user?.id;
    if (userId) {
      subscribeToInvitations($page.data.supabase, userId);
    }
  });

  onDestroy(() => {
    unsubscribeFromLobby();
    unsubscribeFromInvitations();
  });

  // Optimistic states
  let optimisticInvited = $state(new Set<string>());
  let removedSentInvitations = $state(new Set<string>());
  let removedReceivedInvitations = $state(new Set<string>());
  let loadingSend = $state(new Set<string>());
  let loadingCancel = $state(new Set<string>());
  let loadingAccept = $state(new Set<string>());
  let loadingDecline = $state(new Set<string>());

  // Lobby states
  let lobbyChallenges = $state<InvitationItem[]>([]);
  let removedLobbyChallenges = $state(new Set<string>());
  let loadingLobbyAccept = $state(new Set<string>());
  let loadingLobbyCancel = $state(new Set<string>());
  let creatingChallenge = $state(false);
  let lobbyLoading = $state(true);
  let myActiveChallenge = $state<InvitationItem | null>(null);

  $effect(() => {
    const version = ++lobbyHydrationVersion;
    lobbyLoading = true;

    void resolveLobbyHydration(data.openChallenges, data.myActiveChallenge).then((hydration) => {
      if (version !== lobbyHydrationVersion) return;

      if (hydration.openChallenges) {
        lobbyChallenges = hydrateLobbyChallenges(
          hydration.openChallenges,
          lobbyChallenges,
          removedLobbyChallenges
        );
      }

      if (hydration.myActiveChallenge !== undefined) {
        myActiveChallenge = hydration.myActiveChallenge;
      }

      lobbyLoading = false;
    });
  });

  // Visible lobby challenges — server + realtime, minus removed
  let visibleLobbyChallenges = $derived(
    lobbyChallenges.filter((c) => !removedLobbyChallenges.has(c.id))
  );

  // Whether current user has an active open challenge
  let hasActiveChallenge = $derived(
    myActiveChallenge !== null ||
    lobbyChallenges.some((c) => c.fromUser.id === $page.data.session?.user?.id && !removedLobbyChallenges.has(c.id))
  );

  // Invite link state
  let creatingLink = $state(false);
  let createdInviteCode = $state<string | null>(null);
  let copiedLink = $state(false);

  // Screen reader announcement
  let srAnnouncement = $state('');

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

  // Listen for realtime invitation events (friend challenges)
  $effect(() => {
    const unsub = onInvitationRealtimeEvent(async (event: InvitationRealtimeEvent) => {
      if (event.type === 'received') {
        const newInvitation: InvitationItem = {
          id: event.id,
          fromUser: { id: event.fromUser, displayName: '' },
          toUser: null,
          gameConfig: event.gameConfig,
          inviteCode: event.inviteCode,
          status: 'pending',
          createdAt: event.createdAt
        };
        realtimeReceivedInvitations = [...realtimeReceivedInvitations, newInvitation];

        const { data: profile } = await $page.data.supabase
          .from('profiles')
          .select('display_name')
          .eq('id', event.fromUser)
          .single();
        if (profile) {
          realtimeReceivedInvitations = realtimeReceivedInvitations.map((inv) =>
            inv.id === event.id
              ? { ...inv, fromUser: { ...inv.fromUser, displayName: sanitizeName(profile.display_name) } }
              : inv
          );
        }
      } else if (event.type === 'statusChanged') {
        removedSentInvitations = new Set([...removedSentInvitations, event.id]);
        const inv = data.sentInvitations.find((i: InvitationItem) => i.id === event.id);
        if (inv?.toUser) {
          const next = new Set(optimisticInvited);
          next.delete(inv.toUser.id);
          optimisticInvited = next;
        }

        // If our open challenge was accepted, navigate to game
        if (event.newStatus === 'accepted') {
          if (
            shouldNavigateOnAcceptedSentInvitation(
              event.id,
              myActiveChallenge,
              data.sentInvitations
            )
          ) {
            removedLobbyChallenges = new Set([...removedLobbyChallenges, event.id]);
            myActiveChallenge = clearMyActiveChallenge(myActiveChallenge, event.id);
            toast.success(i18n.t('lobby.toast.challengeAccepted'), { duration: 4000 });
            const game = await waitForGameByInvitation(event.id);
            if (game) {
              goto(`/play/online/${game.id}`);
            }
          }
        }
      } else if (event.type === 'deleted') {
        removedReceivedInvitations = new Set([...removedReceivedInvitations, event.id]);
      }
    });

    return unsub;
  });

  // Listen for lobby realtime events (open challenges)
  $effect(() => {
    const unsub = onLobbyRealtimeEvent(async (event: LobbyChallengeEvent) => {
      const currentUserId = $page.data.session?.user?.id;
      if (event.type === 'insert') {
        // Don't add our own challenge (already shown via optimistic update)
        if (event.fromUser === currentUserId) return;

        const newChallenge: InvitationItem = {
          id: event.id,
          fromUser: { id: event.fromUser, displayName: '' },
          toUser: null,
          gameConfig: event.gameConfig,
          inviteCode: null,
          status: 'pending',
          createdAt: event.createdAt
        };
        lobbyChallenges = [newChallenge, ...lobbyChallenges];

        // Fetch display name
        const { data: profile } = await $page.data.supabase
          .from('profiles')
          .select('display_name')
          .eq('id', event.fromUser)
          .single();
        if (profile) {
          lobbyChallenges = lobbyChallenges.map((c) =>
            c.id === event.id
              ? { ...c, fromUser: { ...c.fromUser, displayName: sanitizeName(profile.display_name) } }
              : c
          );
        }
      } else if (event.type === 'update') {
        // Challenge accepted, cancelled, or expired — remove from lobby
        if (event.newStatus !== 'pending') {
          removedLobbyChallenges = new Set([...removedLobbyChallenges, event.id]);
          myActiveChallenge = clearMyActiveChallenge(myActiveChallenge, event.id);
        }
      } else if (event.type === 'delete') {
        removedLobbyChallenges = new Set([...removedLobbyChallenges, event.id]);
        myActiveChallenge = clearMyActiveChallenge(myActiveChallenge, event.id);
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

  async function refreshLobbyData(): Promise<void> {
    lobbyLoading = true;
    try {
      await invalidateAll();
    } catch (error) {
      lobbyLoading = false;
      throw error;
    }
  }

  async function waitForGameByInvitation(
    invitationId: string,
    retries = 25,
    delayMs = 200
  ): Promise<{ id: string } | null> {
    for (let attempt = 0; attempt < retries; attempt++) {
      const { data: game } = await $page.data.supabase
        .from('games')
        .select('id')
        .eq('invitation_id', invitationId)
        .single();

      if (game) {
        return game;
      }

      if (attempt < retries - 1) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }

    return null;
  }

  // ─── Lobby handlers ─────────────────────────────────────────────

  async function handleCreateChallenge() {
    if (lobbyLoading) {
      return;
    }

    if (hasActiveChallenge) {
      toast.error(i18n.t('lobby.alreadyHasChallenge'));
      return;
    }

    creatingChallenge = true;
    try {
      const response = await postAction('createOpenChallenge', {
        gameConfig: JSON.stringify({ ...selectedConfig, isRated: openChallengeRated })
      });

      if (!response.ok) {
        const result = deserialize(await response.text());
        const errorCode = result.type === 'failure'
          ? (result.data as { errors?: { form?: string } } | null)?.errors?.form
          : undefined;
        if (errorCode === 'alreadyHasChallenge') {
          toast.error(i18n.t('lobby.alreadyHasChallenge'));
        } else if (errorCode === 'invalidGameConfig') {
          toast.error(i18n.t('invitation.error.invalidGameConfig'));
        } else {
          toast.error(i18n.t('lobby.toast.createFailed'));
        }
        return;
      }

      const result = deserialize(await response.text());
      const invitationId =
        result.type === 'success' ? (result.data as { invitationId?: string })?.invitationId : undefined;

      if (invitationId) {
        myActiveChallenge = {
          id: invitationId,
          fromUser: {
            id: $page.data.session?.user?.id ?? '',
            displayName: $page.data.session?.user?.user_metadata?.display_name ?? ''
          },
          toUser: null,
          gameConfig: { ...selectedConfig, isRated: openChallengeRated },
          inviteCode: null,
          status: 'pending',
          createdAt: new Date().toISOString()
        };
      }

      toast.success(i18n.t('lobby.toast.created'), { duration: 4000 });
      await refreshLobbyData();
    } catch {
      toast.error(i18n.t('lobby.toast.createFailed'));
    } finally {
      creatingChallenge = false;
    }
  }

  async function handleAcceptChallenge(invitationId: string) {
    loadingLobbyAccept = new Set([...loadingLobbyAccept, invitationId]);

    try {
      const response = await postAction('acceptOpenChallenge', { invitationId });

      if (!response.ok) {
        toast.error(i18n.t('lobby.toast.acceptFailed'));
        return;
      }

      const result = deserialize(await response.text());
      const gameId = result.type === 'success' ? (result.data as { gameId?: string })?.gameId : undefined;

      removedLobbyChallenges = new Set([...removedLobbyChallenges, invitationId]);
      toast.success(i18n.t('lobby.toast.accepted'), { duration: 4000 });

      if (gameId) {
        goto(`/play/online/${gameId}`);
      }
    } catch {
      toast.error(i18n.t('lobby.toast.acceptFailed'));
    } finally {
      const next = new Set(loadingLobbyAccept);
      next.delete(invitationId);
      loadingLobbyAccept = next;
    }
  }

  async function handleCancelChallenge(invitationId: string) {
    loadingLobbyCancel = new Set([...loadingLobbyCancel, invitationId]);

    try {
      const response = await postAction('cancelOpenChallenge', { invitationId });

      if (!response.ok) {
        toast.error(i18n.t('lobby.toast.cancelFailed'));
        return;
      }

      removedLobbyChallenges = new Set([...removedLobbyChallenges, invitationId]);
      myActiveChallenge = clearMyActiveChallenge(myActiveChallenge, invitationId);
      toast.success(i18n.t('lobby.toast.cancelled'), { duration: 4000 });
      await refreshLobbyData();
    } catch {
      toast.error(i18n.t('lobby.toast.cancelFailed'));
    } finally {
      const next = new Set(loadingLobbyCancel);
      next.delete(invitationId);
      loadingLobbyCancel = next;
    }
  }

  // ─── Friend invitation handlers ─────────────────────────────────

  async function handleInvite(friendUserId: string) {
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
        const result = deserialize(await response.text());
        const errorCode = result.type === 'failure'
          ? (result.data as { errors?: { form?: string } } | null)?.errors?.form
          : undefined;
        if (errorCode === 'alreadyInvited') {
          toast.error(i18n.t('invitation.error.alreadyInvited'));
        } else if (errorCode === 'cannotInviteSelf') {
          toast.error(i18n.t('invitation.error.cannotInviteSelf'));
        } else if (errorCode === 'invalidGameConfig') {
          toast.error(i18n.t('invitation.error.invalidGameConfig'));
        } else {
          toast.error(i18n.t('invitation.toast.sendFailed'));
        }
        return;
      }

      toast.success(i18n.t('invitation.toast.sent'), { duration: 4000 });
      await refreshLobbyData();
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

      const inv = data.sentInvitations.find((i: InvitationItem) => i.id === invitationId);
      if (inv?.toUser) {
        const next = new Set(optimisticInvited);
        next.delete(inv.toUser.id);
        optimisticInvited = next;
      }

      removedSentInvitations = new Set([...removedSentInvitations, invitationId]);
      toast.success(i18n.t('invitation.toast.cancelled'), { duration: 4000 });
      await refreshLobbyData();
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

      const result = deserialize(await response.text());
      const gameId = result.type === 'success' ? (result.data as { gameId?: string })?.gameId : undefined;

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

  async function handleCreateInviteLink() {
    creatingLink = true;
    createdInviteCode = null;

    try {
      const response = await postAction('createShareableInvitation', {
        gameConfig: JSON.stringify(selectedConfig)
      });

      if (!response.ok) {
        const result = deserialize(await response.text());
        const errorCode = result.type === 'failure'
          ? (result.data as { errors?: { form?: string } } | null)?.errors?.form
          : undefined;
        if (errorCode === 'invalidGameConfig') {
          toast.error(i18n.t('invitation.error.invalidGameConfig'));
        } else {
          toast.error(i18n.t('inviteLink.toast.createFailed'));
        }
        return;
      }

      const result = deserialize(await response.text());
      const inviteCode = result.type === 'success'
        ? (result.data as { inviteCode?: string })?.inviteCode
        : undefined;

      if (inviteCode) {
        createdInviteCode = inviteCode;
        toast.success(i18n.t('inviteLink.toast.created'), { duration: 4000 });
        await refreshLobbyData();
      }
    } catch {
      toast.error(i18n.t('inviteLink.toast.createFailed'));
    } finally {
      creatingLink = false;
    }
  }

  async function handleCopyInviteLink(code: string) {
    try {
      const url = `${window.location.origin}/play/online/invite/${code}`;
      await navigator.clipboard.writeText(url);
      copiedLink = true;
      srAnnouncement = i18n.t('common.copied');
      setTimeout(() => {
        copiedLink = false;
        srAnnouncement = '';
      }, 2000);
    } catch {
      srAnnouncement = i18n.t('share.toastCopyFailed');
      setTimeout(() => (srAnnouncement = ''), 2000);
    }
  }
</script>

<svelte:head>
  <title>{i18n.t('invitation.pageTitle')} | {i18n.t('nav.appName')}</title>
</svelte:head>

<CommandCenter center={centerContent} />

{#snippet centerContent()}
  <div class="online-hub">
    <!-- Open Challenges Lobby -->
    <h2 class="section-header">
      {i18n.t('lobby.openChallenges')} ({visibleLobbyChallenges.length})
    </h2>

    <LobbyChallengeList
      challenges={visibleLobbyChallenges}
      currentUserId={$page.data.session?.user?.id ?? ''}
      loading={lobbyLoading}
      loadingAcceptIds={loadingLobbyAccept}
      loadingCancelIds={loadingLobbyCancel}
      onaccept={handleAcceptChallenge}
      oncancel={handleCancelChallenge}
      oncreate={handleCreateChallenge}
    />

    <hr class="divider" />

    <!-- Create Challenge / Time Control -->
    <h2 class="section-header">{i18n.t('lobby.createChallenge')}</h2>

    <div class="toggle-group">
      {#each TIME_PRESETS as preset, idx}
        {#if idx > 0}
          <span class="separator">·</span>
        {/if}
        <button
          class:active={selectedPresetIndex === idx}
          onclick={() => { selectedPresetIndex = idx; selectedConfig = { ...preset.config }; }}
        >
          {preset.config.timeMinutes}+{preset.config.incrementSeconds}
        </button>
      {/each}
    </div>

    <div class="toggle-group match-type-toggle" role="group" aria-label={i18n.t('lobby.createChallenge')}>
      <button
        class:active={!openChallengeRated}
        type="button"
        onclick={() => { openChallengeRated = false; }}
      >
        {i18n.t('lobby.casual')}
      </button>
      <span class="separator">·</span>
      <button
        class:active={openChallengeRated}
        type="button"
        onclick={() => { openChallengeRated = true; }}
      >
        {i18n.t('lobby.rated')}
      </button>
    </div>

    <div class="challenge-actions">
      <button
        class="text-link"
        disabled={creatingChallenge || lobbyLoading || hasActiveChallenge}
        onclick={handleCreateChallenge}
      >
        {creatingChallenge ? '...' : i18n.t('lobby.createGame')}
      </button>
      <span class="separator">·</span>
      {#if createdInviteCode}
        <div class="invite-result">
          <input
            type="text"
            readonly
            value="{typeof window !== 'undefined' ? window.location.origin : ''}/play/online/invite/{createdInviteCode}"
            class="invite-input"
          />
          <button class="text-link" onclick={() => handleCopyInviteLink(createdInviteCode!)}>
            {copiedLink ? i18n.t('common.copied') : i18n.t('inviteLink.copyLink')}
          </button>
        </div>
        <button class="text-link" onclick={() => { createdInviteCode = null; }}>
          {i18n.t('inviteLink.create.another')}
        </button>
      {:else}
        <button
          class="text-link"
          disabled={creatingLink}
          onclick={handleCreateInviteLink}
        >
          {creatingLink ? '...' : i18n.t('inviteLink.create.button')}
        </button>
      {/if}
    </div>

    <hr class="divider" />

    <!-- Friends Online -->
    <h2 class="section-header">
      {i18n.t('invitation.onlineFriends.title')} ({onlineFriends.length})
    </h2>

    {#if onlineFriends.length === 0}
      <p class="text-dim">{i18n.t('invitation.onlineFriends.empty')}</p>
      <a href="/user/friends" class="text-link">{i18n.t('invitation.onlineFriends.emptyLink')}</a>
    {:else}
      <div class="flat-list">
        {#each onlineFriends as friend (friend.friendshipId)}
          {@const isInvited = pendingToUserIds.has(friend.userId)}
          {@const isSending = loadingSend.has(friend.userId)}
          <div class="flat-list-item">
            <span class="status-dot"></span>
            <span class="friend-name">{friend.displayName}</span>
            {#if isInvited}
              <span class="text-dim">{i18n.t('invitation.action.invited')}</span>
            {:else}
              <button
                class="text-link"
                disabled={isSending}
                onclick={() => handleInvite(friend.userId)}
              >
                {isSending ? '...' : i18n.t('invitation.action.invite')}
              </button>
            {/if}
          </div>
        {/each}
      </div>
    {/if}

    <!-- Received Invitations -->
    {#if visibleReceivedInvitations.length > 0}
      <hr class="divider" />
      <h2 class="section-header">
        {i18n.t('invitation.received.title')} ({visibleReceivedInvitations.length})
      </h2>
      <div class="flat-list">
        {#each visibleReceivedInvitations as invitation (invitation.id)}
          <div class="flat-list-item">
            <span>from {invitation.fromUser?.displayName || '...'}</span>
            <span class="text-dim">{invitation.gameConfig.timeMinutes}+{invitation.gameConfig.incrementSeconds}</span>
            <button
              class="text-link"
              disabled={loadingAccept.has(invitation.id)}
              onclick={() => handleAccept(invitation.id)}
            >
              {loadingAccept.has(invitation.id) ? '...' : i18n.t('invitation.action.accept')}
            </button>
            <button
              class="text-link"
              disabled={loadingDecline.has(invitation.id)}
              onclick={() => handleDecline(invitation.id)}
            >
              {i18n.t('invitation.action.decline')}
            </button>
          </div>
        {/each}
      </div>
    {/if}

    <!-- Sent Invitations -->
    {#if visibleSentInvitations.length > 0}
      <hr class="divider" />
      <h2 class="section-header">
        {i18n.t('invitation.sent.title')} ({visibleSentInvitations.length})
      </h2>
      <div class="flat-list">
        {#each visibleSentInvitations as invitation (invitation.id)}
          <div class="flat-list-item">
            <span>to {invitation.toUser?.displayName || i18n.t('inviteLink.anyone')}</span>
            <span class="text-dim">{invitation.gameConfig.timeMinutes}+{invitation.gameConfig.incrementSeconds}</span>
            <button
              class="text-link"
              disabled={loadingCancel.has(invitation.id)}
              onclick={() => handleCancel(invitation.id)}
            >
              {i18n.t('invitation.action.cancel')}
            </button>
            {#if !invitation.toUser && invitation.inviteCode}
              <button
                class="text-link"
                onclick={() => handleCopyInviteLink(invitation.inviteCode!)}
              >
                {copiedLink ? i18n.t('common.copied') : i18n.t('inviteLink.copyLink')}
              </button>
            {/if}
          </div>
        {/each}
      </div>
    {/if}
  </div>
{/snippet}

<!-- Screen reader announcements -->
<div class="sr-only" aria-live="polite" aria-atomic="true">{srAnnouncement}</div>

<style>
  .online-hub {
    max-width: 600px;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .text-dim {
    color: var(--theme-text-secondary, #666);
    font-size: 0.8125rem;
  }

  .friend-name {
    flex: 1;
    font-size: 0.8125rem;
    color: var(--theme-text-primary, #eee);
  }

  .challenge-actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .challenge-actions .separator {
    color: var(--theme-text-secondary, #666);
  }

  .invite-result {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }

  .invite-input {
    flex: 1;
    padding: 0.375rem 0.5rem;
    background: var(--theme-bg-dark, #111);
    border: 1px solid var(--theme-border, #444);
    color: var(--theme-text-primary, #eee);
    font-size: 0.75rem;
    overflow: hidden;
    text-overflow: ellipsis;
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
</style>
