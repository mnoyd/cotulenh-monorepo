import type { SupabaseClient } from '@supabase/supabase-js';
import { DEFAULT_POSITION } from '@cotulenh/core';
import type { GameConfig, InvitationItem } from './types';
import { logger } from '@cotulenh/common';

/** Strip HTML tags from display name to prevent stored XSS at query boundary */
export function sanitizeName(name: string): string {
  return name.replace(/<[^>]*>/g, '');
}

/**
 * Validate game config server-side: timeMinutes 1-60, incrementSeconds 0-30
 */
export function validateGameConfig(config: unknown): config is GameConfig {
  if (typeof config !== 'object' || config === null) return false;
  const c = config as Record<string, unknown>;
  return (
    typeof c.timeMinutes === 'number' &&
    Number.isInteger(c.timeMinutes) &&
    c.timeMinutes >= 1 &&
    c.timeMinutes <= 60 &&
    typeof c.incrementSeconds === 'number' &&
    Number.isInteger(c.incrementSeconds) &&
    c.incrementSeconds >= 0 &&
    c.incrementSeconds <= 30 &&
    (typeof c.isRated === 'undefined' || typeof c.isRated === 'boolean') &&
    (typeof c.preferredColor === 'undefined' ||
      c.preferredColor === 'random' ||
      c.preferredColor === 'red' ||
      c.preferredColor === 'blue')
  );
}

async function createGameWithInitialState(
  supabase: SupabaseClient,
  invitationId: string
): Promise<{ gameId?: string; error?: unknown }> {
  const { data, error } = await supabase.rpc('create_game_with_state', {
    p_invitation_id: invitationId,
    p_fen: DEFAULT_POSITION
  });

  if (error || typeof data !== 'string') {
    return { error: error ?? new Error('create_game_with_state returned invalid game id') };
  }

  return { gameId: data };
}

type ProfileSummary = { displayName: string; rating?: number; ratingGamesPlayed?: number };

function readOptionalRating(profile: { rating?: unknown }): number | undefined {
  return typeof profile.rating === 'number' ? profile.rating : undefined;
}

function readOptionalRatingGamesPlayed(profile: {
  rating_games_played?: unknown;
}): number | undefined {
  return typeof profile.rating_games_played === 'number' ? profile.rating_games_played : undefined;
}

async function loadProfileMap(
  supabase: SupabaseClient,
  userIds: string[]
): Promise<Map<string, ProfileSummary>> {
  const uniqueUserIds = [...new Set(userIds)];
  if (uniqueUserIds.length === 0) {
    return new Map();
  }

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, display_name, rating, rating_games_played')
    .in('id', uniqueUserIds);

  if (!profiles) {
    return new Map();
  }

  return new Map(
    profiles.map((profile) => [
      profile.id,
      {
        displayName: profile.display_name,
        rating: readOptionalRating(profile as { rating?: unknown }),
        ratingGamesPlayed: readOptionalRatingGamesPlayed(
          profile as { rating_games_played?: unknown }
        )
      }
    ])
  );
}

/**
 * Check if a pending invitation already exists from one user to another
 */
export async function hasPendingInvitation(
  supabase: SupabaseClient,
  fromUserId: string,
  toUserId: string
): Promise<boolean> {
  const { data } = await supabase
    .from('game_invitations')
    .select('id')
    .eq('from_user', fromUserId)
    .eq('to_user', toUserId)
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString())
    .limit(1);

  return Array.isArray(data) && data.length > 0;
}

/**
 * Send a match invitation to a friend
 */
export async function sendInvitation(
  supabase: SupabaseClient,
  fromUserId: string,
  toUserId: string,
  gameConfig: GameConfig
): Promise<{
  success: boolean;
  error?: string;
  inviteCode?: string | null;
  invitationId?: string;
}> {
  if (fromUserId === toUserId) {
    return { success: false, error: 'cannotInviteSelf' };
  }

  // Check for existing pending invitation
  const alreadyPending = await hasPendingInvitation(supabase, fromUserId, toUserId);
  if (alreadyPending) {
    return { success: false, error: 'alreadyInvited' };
  }

  const { data, error } = await supabase
    .from('game_invitations')
    .insert({
      from_user: fromUserId,
      to_user: toUserId,
      game_config: gameConfig,
      status: 'pending'
    })
    .select('id, invite_code')
    .single();

  if (error || !data) {
    logger.error(error ?? new Error('Unknown'), 'sendInvitation: insert failed');
    return { success: false, error: 'sendFailed' };
  }

  return { success: true, inviteCode: data.invite_code, invitationId: data.id };
}

/**
 * Get sent pending invitations for a user, with recipient display names
 */
export async function getSentInvitations(
  supabase: SupabaseClient,
  userId: string
): Promise<InvitationItem[]> {
  const { data: invitations, error } = await supabase
    .from('game_invitations')
    .select('id, from_user, to_user, game_config, invite_code, status, created_at')
    .eq('from_user', userId)
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false });

  if (error || !invitations || invitations.length === 0) return [];

  // Get recipient profiles
  const recipientIds = invitations
    .map((inv) => inv.to_user)
    .filter((id): id is string => id !== null);

  const profileMap = await loadProfileMap(supabase, recipientIds);

  return invitations.map((inv) => ({
    id: inv.id,
    fromUser: { id: inv.from_user, displayName: '' },
    toUser: inv.to_user
      ? {
          id: inv.to_user,
          displayName: sanitizeName(profileMap.get(inv.to_user)?.displayName ?? '')
        }
      : null,
    gameConfig: inv.game_config as GameConfig,
    inviteCode: inv.invite_code,
    status: inv.status,
    createdAt: inv.created_at
  }));
}

/**
 * Cancel a sent invitation — only the sender (from_user) can cancel
 */
export async function cancelInvitation(
  supabase: SupabaseClient,
  invitationId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const { data, error } = await supabase
    .from('game_invitations')
    .delete()
    .eq('id', invitationId)
    .eq('from_user', userId)
    .eq('status', 'pending')
    .select('id')
    .single();

  if (error || !data) {
    return { success: false, error: 'cancelFailed' };
  }

  return { success: true };
}

/**
 * Get received pending invitations for a user, with sender display names
 */
export async function getReceivedInvitations(
  supabase: SupabaseClient,
  userId: string
): Promise<InvitationItem[]> {
  const { data: invitations, error } = await supabase
    .from('game_invitations')
    .select('id, from_user, to_user, game_config, invite_code, status, created_at')
    .eq('to_user', userId)
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false });

  if (error || !invitations || invitations.length === 0) return [];

  // Get sender profiles
  const senderIds = invitations.map((inv) => inv.from_user);

  const profileMap = await loadProfileMap(supabase, senderIds);

  return invitations.map((inv) => {
    const profile = profileMap.get(inv.from_user);
    return {
      id: inv.id,
      fromUser: {
        id: inv.from_user,
        displayName: sanitizeName(profile?.displayName ?? ''),
        ...(profile?.rating != null
          ? { rating: profile.rating, ratingGamesPlayed: profile.ratingGamesPlayed ?? 0 }
          : {})
      },
      toUser: inv.to_user ? { id: inv.to_user, displayName: '' } : null,
      gameConfig: inv.game_config as GameConfig,
      inviteCode: inv.invite_code,
      status: inv.status,
      createdAt: inv.created_at
    };
  });
}

/**
 * Accept a received invitation — only the recipient (to_user) can accept.
 * Updates invitation status and creates a games row.
 * Sender = red (first to move), recipient = blue.
 */
export async function acceptInvitation(
  supabase: SupabaseClient,
  invitationId: string,
  userId: string
): Promise<{ success: boolean; error?: string; gameId?: string }> {
  // 1. Update invitation status to 'accepted', verifying recipient and pending status
  const { data: invitation, error: updateError } = await supabase
    .from('game_invitations')
    .update({ status: 'accepted' })
    .eq('id', invitationId)
    .eq('to_user', userId)
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString())
    .select('id, from_user, game_config')
    .single();

  if (updateError || !invitation) {
    return { success: false, error: 'invitationUnavailable' };
  }

  // 2. Create game + game state atomically via RPC.
  const { gameId, error: insertError } = await createGameWithInitialState(supabase, invitation.id);

  if (insertError || !gameId) {
    // Rollback invitation status on game creation failure
    logger.error(insertError as Error, 'Failed to create game after accepting invitation');
    await supabase.from('game_invitations').update({ status: 'pending' }).eq('id', invitationId);
    return { success: false, error: 'gameCreationFailed' };
  }

  return { success: true, gameId };
}

/**
 * Decline a received invitation — only the recipient (to_user) can decline
 */
export async function declineInvitation(
  supabase: SupabaseClient,
  invitationId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const { data, error } = await supabase
    .from('game_invitations')
    .update({ status: 'declined' })
    .eq('id', invitationId)
    .eq('to_user', userId)
    .eq('status', 'pending')
    .select('id')
    .single();

  if (error || !data) {
    return { success: false, error: 'declineFailed' };
  }

  return { success: true };
}

/**
 * Fetch a shareable link invitation by invite code.
 * Uses SECURITY DEFINER RPC function to prevent enumeration of all pending link invites.
 * Only returns pending, unexpired, unclaimed (to_user IS NULL) invitations.
 * Works for both authenticated and anonymous users.
 */
export async function getInvitationByCode(
  supabase: SupabaseClient,
  inviteCode: string
): Promise<{
  id: string;
  fromUser: { id: string; displayName: string };
  gameConfig: GameConfig;
  inviteCode: string;
  createdAt: string;
  expiresAt: string;
} | null> {
  const { data, error } = await supabase.rpc('get_invitation_by_code', {
    p_invite_code: inviteCode
  });

  if (error || !data) {
    return null;
  }

  return {
    id: data.id,
    fromUser: {
      id: data.from_user,
      displayName: sanitizeName(data.display_name ?? '')
    },
    gameConfig: data.game_config as GameConfig,
    inviteCode: data.invite_code,
    createdAt: data.created_at,
    expiresAt: data.expires_at
  };
}

/**
 * Create a shareable invitation link (to_user = NULL, 24-hour expiration).
 */
export async function createShareableInvitation(
  supabase: SupabaseClient,
  fromUserId: string,
  gameConfig: GameConfig
): Promise<{ success: boolean; inviteCode?: string; error?: string }> {
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('game_invitations')
    .insert({
      from_user: fromUserId,
      to_user: null,
      game_config: gameConfig,
      status: 'pending',
      expires_at: expiresAt
    })
    .select('id, invite_code')
    .single();

  if (error || !data) {
    logger.error(error ?? new Error('Unknown'), 'createShareableInvitation: insert failed');
    return { success: false, error: 'createFailed' };
  }

  return { success: true, inviteCode: data.invite_code };
}

/**
 * Accept a shareable invite link using claim-then-accept pattern.
 * Step 1: Claim (set to_user atomically where to_user IS NULL)
 * Step 2: Update status to accepted
 * Step 3: Create games row (sender=red, acceptor=blue)
 * Rolls back on failure.
 */
export async function acceptInviteLink(
  supabase: SupabaseClient,
  inviteCode: string,
  userId: string
): Promise<{ success: boolean; gameId?: string; inviterUserId?: string; error?: string }> {
  // Step 1: Claim the invitation atomically via SECURITY DEFINER RPC.
  const { data: claimed, error: claimError } = await supabase.rpc('claim_link_invitation', {
    p_invite_code: inviteCode
  });

  if (claimError || !claimed) {
    return { success: false, error: 'alreadyClaimed' };
  }

  // Step 2: Update status to accepted
  const { error: acceptError } = await supabase
    .from('game_invitations')
    .update({ status: 'accepted' })
    .eq('id', claimed.id)
    .eq('status', 'pending')
    .eq('to_user', userId)
    .gt('expires_at', new Date().toISOString())
    .select('id')
    .single();

  if (acceptError) {
    // Rollback claim
    await supabase.from('game_invitations').update({ to_user: null }).eq('id', claimed.id);
    return { success: false, error: 'acceptFailed' };
  }

  // Step 3: Auto-friend users as a detached side effect.
  // Do not block the game start path on friendship reconciliation latency.
  void createAutoFriendship(supabase, userId, claimed.from_user);

  // Step 4: Create game + game_state atomically via RPC
  const { gameId, error: gameError } = await createGameWithInitialState(supabase, claimed.id);

  if (gameError || !gameId) {
    // Rollback: revert invitation to pending + unclaimed
    logger.error(gameError as Error, 'acceptInviteLink: game creation failed, rolling back');
    await supabase
      .from('game_invitations')
      .update({ status: 'pending', to_user: null })
      .eq('id', claimed.id);
    return { success: false, error: 'gameCreationFailed' };
  }

  return { success: true, gameId, inviterUserId: claimed.from_user };
}

// ────────────────────────────────────────────────────────────────
// Open Challenge (Lobby) Helpers
// ────────────────────────────────────────────────────────────────

/**
 * Check if a user already has a pending open challenge.
 * Returns the invitation if found, null otherwise.
 */
export async function getMyActiveOpenChallenge(
  supabase: SupabaseClient,
  userId: string
): Promise<InvitationItem | null> {
  const { data, error } = await supabase
    .from('game_invitations')
    .select('id, from_user, to_user, game_config, invite_code, status, created_at')
    .eq('from_user', userId)
    .is('to_user', null)
    .is('invite_code', null)
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString())
    .limit(1)
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    fromUser: { id: data.from_user, displayName: '' },
    toUser: null,
    gameConfig: data.game_config as GameConfig,
    inviteCode: data.invite_code,
    status: data.status,
    createdAt: data.created_at
  };
}

/**
 * Create an open challenge visible in the lobby.
 * Open challenges have to_user = NULL and invite_code = NULL.
 * Enforces one active open challenge per player.
 */
export async function createOpenChallenge(
  supabase: SupabaseClient,
  fromUserId: string,
  gameConfig: GameConfig
): Promise<{ success: boolean; error?: string; invitationId?: string }> {
  await supabase
    .from('game_invitations')
    .update({ status: 'expired' })
    .eq('from_user', fromUserId)
    .is('to_user', null)
    .is('invite_code', null)
    .eq('status', 'pending')
    .lt('expires_at', new Date().toISOString());

  // Check for existing active open challenge (AC8)
  const existing = await getMyActiveOpenChallenge(supabase, fromUserId);
  if (existing) {
    return { success: false, error: 'alreadyHasChallenge' };
  }

  const { data, error } = await supabase
    .from('game_invitations')
    .insert({
      from_user: fromUserId,
      to_user: null,
      invite_code: null,
      game_config: gameConfig,
      status: 'pending'
    })
    .select('id')
    .single();

  if (error || !data) {
    if ((error as { code?: string } | null)?.code === '23505') {
      return { success: false, error: 'alreadyHasChallenge' };
    }
    logger.error(error ?? new Error('Unknown'), 'createOpenChallenge: insert failed');
    return { success: false, error: 'createFailed' };
  }

  return { success: true, invitationId: data.id };
}

/**
 * Get all open challenges for the lobby.
 * Returns challenges where to_user IS NULL AND invite_code IS NULL,
 * ordered by newest first, with creator display names.
 */
export async function getOpenChallenges(supabase: SupabaseClient): Promise<InvitationItem[]> {
  const { data: challenges, error } = await supabase
    .from('game_invitations')
    .select('id, from_user, to_user, game_config, invite_code, status, created_at')
    .is('to_user', null)
    .is('invite_code', null)
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false });

  if (error || !challenges || challenges.length === 0) return [];

  // Get creator profiles
  const creatorIds = challenges.map((c) => c.from_user);

  const profileMap = await loadProfileMap(supabase, creatorIds);

  return challenges.map((c) => {
    const profile = profileMap.get(c.from_user);
    return {
      id: c.id,
      fromUser: {
        id: c.from_user,
        displayName: sanitizeName(profile?.displayName ?? ''),
        ...(profile?.rating != null
          ? { rating: profile.rating, ratingGamesPlayed: profile.ratingGamesPlayed ?? 0 }
          : {})
      },
      toUser: null,
      gameConfig: c.game_config as GameConfig,
      inviteCode: c.invite_code,
      status: c.status,
      createdAt: c.created_at
    };
  });
}

/**
 * Accept an open challenge from the lobby.
 * Uses claim-then-accept pattern: set to_user, then update status and create game.
 * Prevents self-accept.
 */
export async function acceptOpenChallenge(
  supabase: SupabaseClient,
  invitationId: string,
  userId: string
): Promise<{ success: boolean; error?: string; gameId?: string }> {
  // Step 1: Claim — set to_user atomically where to_user IS NULL
  const { data: claimed, error: claimError } = await supabase
    .from('game_invitations')
    .update({ to_user: userId })
    .eq('id', invitationId)
    .is('to_user', null)
    .is('invite_code', null)
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString())
    .neq('from_user', userId)
    .select('id, from_user, game_config')
    .single();

  if (claimError || !claimed) {
    return { success: false, error: 'acceptFailed' };
  }

  // Step 2: Accept — update status
  const { error: acceptError } = await supabase
    .from('game_invitations')
    .update({ status: 'accepted' })
    .eq('id', claimed.id)
    .eq('to_user', userId)
    .eq('status', 'pending')
    .select('id')
    .single();

  if (acceptError) {
    // Rollback claim
    await supabase.from('game_invitations').update({ to_user: null }).eq('id', claimed.id);
    return { success: false, error: 'acceptFailed' };
  }

  // Step 3: Create game + game state atomically.
  const { gameId, error: gameError } = await createGameWithInitialState(supabase, claimed.id);

  if (gameError || !gameId) {
    logger.error(gameError as Error, 'acceptOpenChallenge: game creation failed, rolling back');
    await supabase
      .from('game_invitations')
      .update({ status: 'pending', to_user: null })
      .eq('id', claimed.id);
    return { success: false, error: 'gameCreationFailed' };
  }

  return { success: true, gameId };
}

/**
 * Cancel an open challenge — only the creator can cancel.
 * Reuses the same delete pattern as cancelInvitation.
 */
export async function cancelOpenChallenge(
  supabase: SupabaseClient,
  invitationId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  return cancelInvitation(supabase, invitationId, userId);
}

/**
 * Create an auto-accepted friendship between two users.
 * Delegates to SECURITY DEFINER RPC to reconcile accepted friendship under RLS.
 * Returns true only when friendship is confirmed accepted.
 */
export async function createAutoFriendship(
  supabase: SupabaseClient,
  userIdA: string,
  userIdB: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('create_or_accept_friendship', {
      p_user_1: userIdA,
      p_user_2: userIdB,
      p_initiated_by: userIdA
    });

    if (!error && data === true) return true;

    // Unexpected error — log but don't throw (friendship is non-blocking side effect)
    logger.error(
      error ?? new Error('create_or_accept_friendship returned false'),
      'createAutoFriendship failed'
    );
    return false;
  } catch (error) {
    logger.error(error as Error, 'createAutoFriendship failed');
    return false;
  }
}
