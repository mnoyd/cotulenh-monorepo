import type { SupabaseClient } from '@supabase/supabase-js';
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
    c.incrementSeconds <= 30
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
): Promise<{ success: boolean; error?: string; inviteCode?: string }> {
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

  return { success: true, inviteCode: data.invite_code };
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

  let profileMap = new Map<string, string>();
  if (recipientIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name')
      .in('id', recipientIds);

    if (profiles) {
      profileMap = new Map(profiles.map((p) => [p.id, p.display_name]));
    }
  }

  return invitations.map((inv) => ({
    id: inv.id,
    fromUser: { id: inv.from_user, displayName: '' },
    toUser: inv.to_user
      ? { id: inv.to_user, displayName: sanitizeName(profileMap.get(inv.to_user) ?? '') }
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

  let profileMap = new Map<string, string>();
  if (senderIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name')
      .in('id', senderIds);

    if (profiles) {
      profileMap = new Map(profiles.map((p) => [p.id, p.display_name]));
    }
  }

  return invitations.map((inv) => ({
    id: inv.id,
    fromUser: {
      id: inv.from_user,
      displayName: sanitizeName(profileMap.get(inv.from_user) ?? '')
    },
    toUser: inv.to_user ? { id: inv.to_user, displayName: '' } : null,
    gameConfig: inv.game_config as GameConfig,
    inviteCode: inv.invite_code,
    status: inv.status,
    createdAt: inv.created_at
  }));
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
    return { success: false, error: 'acceptFailed' };
  }

  // 2. Create games row — sender is red, recipient is blue
  const { data: game, error: insertError } = await supabase
    .from('games')
    .insert({
      red_player: invitation.from_user,
      blue_player: userId,
      status: 'started',
      time_control: invitation.game_config,
      invitation_id: invitation.id
    })
    .select('id')
    .single();

  if (insertError || !game) {
    // Rollback invitation status on game creation failure
    logger.error(insertError as Error, 'Failed to create game after accepting invitation');
    await supabase
      .from('game_invitations')
      .update({ status: 'pending' })
      .eq('id', invitationId);
    return { success: false, error: 'gameCreationFailed' };
  }

  return { success: true, gameId: game.id };
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
  // Step 1: Claim the invitation (set to_user atomically)
  const { data: claimed, error: claimError } = await supabase
    .from('game_invitations')
    .update({ to_user: userId })
    .eq('invite_code', inviteCode)
    .is('to_user', null)
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString())
    .neq('from_user', userId)
    .select('id, from_user, game_config')
    .single();

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
    await supabase
      .from('game_invitations')
      .update({ to_user: null })
      .eq('id', claimed.id);
    return { success: false, error: 'acceptFailed' };
  }

  // Step 3: Auto-friend users; rollback invitation if friendship reconciliation fails.
  const friendshipCreated = await createAutoFriendship(supabase, userId, claimed.from_user);
  if (!friendshipCreated) {
    await supabase
      .from('game_invitations')
      .update({ status: 'pending', to_user: null })
      .eq('id', claimed.id);
    return { success: false, error: 'friendshipFailed' };
  }

  // Step 4: Create games row — sender is red, acceptor is blue
  const { data: game, error: gameError } = await supabase
    .from('games')
    .insert({
      red_player: claimed.from_user,
      blue_player: userId,
      status: 'started',
      time_control: claimed.game_config,
      invitation_id: claimed.id
    })
    .select('id')
    .single();

  if (gameError || !game) {
    // Rollback: revert invitation to pending + unclaimed
    logger.error(gameError as Error, 'acceptInviteLink: game creation failed, rolling back');
    await supabase
      .from('game_invitations')
      .update({ status: 'pending', to_user: null })
      .eq('id', claimed.id);
    return { success: false, error: 'gameCreationFailed' };
  }

  return { success: true, gameId: game.id, inviterUserId: claimed.from_user };
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
  const { data, error } = await supabase.rpc('create_or_accept_friendship', {
    p_user_1: userIdA,
    p_user_2: userIdB,
    p_initiated_by: userIdA
  });

  if (!error && data === true) return true;

  // Unexpected error — log but don't throw (friendship is non-blocking side effect)
  logger.error(error ?? new Error('create_or_accept_friendship returned false'), 'createAutoFriendship failed');
  return false;
}
