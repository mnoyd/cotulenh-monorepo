import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  FriendSearchResult,
  FriendListItem,
  PendingRequestItem,
  RelationshipStatus
} from './types';

/** Strip HTML tags from display name to prevent stored XSS at query boundary */
function sanitizeName(name: string): string {
  return name.replace(/<[^>]*>/g, '');
}

/**
 * Ensure canonical ordering for friendship pairs: user_a < user_b
 */
export function canonicalPair(id1: string, id2: string): [string, string] {
  return id1 < id2 ? [id1, id2] : [id2, id1];
}

/**
 * Search users by display name, excluding self, with relationship status
 */
export async function searchUsers(
  supabase: SupabaseClient,
  query: string,
  currentUserId: string
): Promise<FriendSearchResult[]> {
  if (query.length < 2) return [];

  // Escape LIKE metacharacters (% and _) in user input
  const escapedQuery = query.replace(/[%_]/g, '\\$&');

  // Search profiles by display name
  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('id, display_name')
    .ilike('display_name', `%${escapedQuery}%`)
    .neq('id', currentUserId)
    .limit(10);

  if (profileError || !profiles || profiles.length === 0) return [];

  // Get all friendships involving the current user
  const { data: friendships } = await supabase
    .from('friendships')
    .select('id, user_a, user_b, status, initiated_by')
    .or(`user_a.eq.${currentUserId},user_b.eq.${currentUserId}`);

  const friendshipMap = new Map<string, { status: string; initiatedBy: string }>();
  if (friendships) {
    for (const f of friendships) {
      const otherUser = f.user_a === currentUserId ? f.user_b : f.user_a;
      friendshipMap.set(otherUser, { status: f.status, initiatedBy: f.initiated_by });
    }
  }

  return profiles.map((p) => {
    const friendship = friendshipMap.get(p.id);
    let relationship: RelationshipStatus = 'none';
    if (friendship) {
      if (friendship.status === 'accepted') {
        relationship = 'accepted';
      } else if (friendship.status === 'blocked') {
        relationship = 'blocked';
      } else if (friendship.status === 'pending') {
        relationship =
          friendship.initiatedBy === currentUserId ? 'pending_sent' : 'pending_received';
      }
    }
    return {
      id: p.id,
      displayName: sanitizeName(p.display_name),
      relationship
    };
  });
}

/**
 * Send a friend request to another user
 */
export async function sendFriendRequest(
  supabase: SupabaseClient,
  fromUserId: string,
  toUserId: string
): Promise<{ success: boolean; error?: string }> {
  if (fromUserId === toUserId) {
    return { success: false, error: 'cannotFriendSelf' };
  }

  const [userA, userB] = canonicalPair(fromUserId, toUserId);

  // Check for existing friendship
  const { data: existing } = await supabase
    .from('friendships')
    .select('id, status')
    .eq('user_a', userA)
    .eq('user_b', userB)
    .single();

  if (existing) {
    if (existing.status === 'accepted') {
      return { success: false, error: 'alreadyFriends' };
    }
    if (existing.status === 'pending') {
      return { success: false, error: 'requestAlreadyPending' };
    }
    if (existing.status === 'blocked') {
      return { success: false, error: 'userBlocked' };
    }
  }

  const { error } = await supabase.from('friendships').insert({
    user_a: userA,
    user_b: userB,
    status: 'pending',
    initiated_by: fromUserId
  });

  if (error) {
    return { success: false, error: 'sendFailed' };
  }

  return { success: true };
}

/**
 * Get the current user's accepted friends list with display names
 */
export async function getFriendsList(
  supabase: SupabaseClient,
  userId: string
): Promise<FriendListItem[]> {
  const { data: friendships, error } = await supabase
    .from('friendships')
    .select('id, user_a, user_b')
    .eq('status', 'accepted')
    .or(`user_a.eq.${userId},user_b.eq.${userId}`);

  if (error || !friendships || friendships.length === 0) return [];

  const friendIds = friendships.map((f) => (f.user_a === userId ? f.user_b : f.user_a));

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, display_name')
    .in('id', friendIds);

  if (!profiles) return [];

  const profileMap = new Map(profiles.map((p) => [p.id, p.display_name]));

  return friendships
    .map((f) => {
      const friendId = f.user_a === userId ? f.user_b : f.user_a;
      return {
        friendshipId: f.id,
        userId: friendId,
        displayName: sanitizeName(profileMap.get(friendId) ?? '')
      };
    })
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
}

/**
 * Get pending incoming friend requests (where someone else initiated)
 */
export async function getPendingIncomingRequests(
  supabase: SupabaseClient,
  userId: string
): Promise<PendingRequestItem[]> {
  const { data: friendships, error } = await supabase
    .from('friendships')
    .select('id, user_a, user_b, initiated_by, created_at')
    .eq('status', 'pending')
    .or(`user_a.eq.${userId},user_b.eq.${userId}`)
    .neq('initiated_by', userId);

  if (error || !friendships || friendships.length === 0) return [];

  const senderIds = friendships.map((f) => f.initiated_by);

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, display_name')
    .in('id', senderIds);

  if (!profiles) return [];

  const profileMap = new Map(profiles.map((p) => [p.id, p.display_name]));

  return friendships
    .map((f) => ({
      friendshipId: f.id,
      userId: f.initiated_by,
      displayName: sanitizeName(profileMap.get(f.initiated_by) ?? ''),
      createdAt: f.created_at
    }))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/**
 * Get pending sent friend requests (where current user initiated)
 */
export async function getPendingSentRequests(
  supabase: SupabaseClient,
  userId: string
): Promise<PendingRequestItem[]> {
  const { data: friendships, error } = await supabase
    .from('friendships')
    .select('id, user_a, user_b, initiated_by, created_at')
    .eq('status', 'pending')
    .eq('initiated_by', userId);

  if (error || !friendships || friendships.length === 0) return [];

  const recipientIds = friendships.map((f) => (f.user_a === userId ? f.user_b : f.user_a));

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, display_name')
    .in('id', recipientIds);

  if (!profiles) return [];

  const profileMap = new Map(profiles.map((p) => [p.id, p.display_name]));

  return friendships
    .map((f) => {
      const recipientId = f.user_a === userId ? f.user_b : f.user_a;
      return {
        friendshipId: f.id,
        userId: recipientId,
        displayName: sanitizeName(profileMap.get(recipientId) ?? ''),
        createdAt: f.created_at
      };
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/**
 * Accept a friend request — only the recipient (non-initiator) can accept
 */
export async function acceptFriendRequest(
  supabase: SupabaseClient,
  friendshipId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const { data, error: updateError } = await supabase
    .from('friendships')
    .update({ status: 'accepted' })
    .eq('id', friendshipId)
    .or(`user_a.eq.${userId},user_b.eq.${userId}`)
    .neq('initiated_by', userId)
    .eq('status', 'pending')
    .select('id')
    .single();

  if (updateError || !data) {
    return { success: false, error: 'acceptFailed' };
  }

  return { success: true };
}

/**
 * Decline a friend request — only the recipient (non-initiator) can decline
 */
export async function declineFriendRequest(
  supabase: SupabaseClient,
  friendshipId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const { data, error: deleteError } = await supabase
    .from('friendships')
    .delete()
    .eq('id', friendshipId)
    .or(`user_a.eq.${userId},user_b.eq.${userId}`)
    .neq('initiated_by', userId)
    .eq('status', 'pending')
    .select('id')
    .single();

  if (deleteError || !data) {
    return { success: false, error: 'declineFailed' };
  }

  return { success: true };
}

/**
 * Remove an accepted friend — either user in the friendship can remove
 */
export async function removeFriend(
  supabase: SupabaseClient,
  friendshipId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const { data, error: deleteError } = await supabase
    .from('friendships')
    .delete()
    .eq('id', friendshipId)
    .or(`user_a.eq.${userId},user_b.eq.${userId}`)
    .eq('status', 'accepted')
    .select('id')
    .single();

  if (deleteError || !data) {
    return { success: false, error: 'removeFailed' };
  }

  return { success: true };
}

/**
 * Cancel a sent friend request — only the initiator can cancel
 */
export async function cancelSentRequest(
  supabase: SupabaseClient,
  friendshipId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const { data, error: deleteError } = await supabase
    .from('friendships')
    .delete()
    .eq('id', friendshipId)
    .eq('initiated_by', userId)
    .eq('status', 'pending')
    .select('id')
    .single();

  if (deleteError || !data) {
    return { success: false, error: 'cancelFailed' };
  }

  return { success: true };
}
