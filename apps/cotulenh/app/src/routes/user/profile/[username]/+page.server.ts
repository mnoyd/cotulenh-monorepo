import { error, fail, redirect } from '@sveltejs/kit';
import { logger } from '@cotulenh/common';
import type { Actions, PageServerLoad } from './$types';
import { getPublicGameHistory, computeGameStats } from '$lib/game/history';
import { canonicalPair, sendFriendRequest } from '$lib/friends/queries';
import type { RelationshipStatus } from '$lib/friends/types';
import { sendInvitation, validateGameConfig } from '$lib/invitations/queries';

export const load: PageServerLoad = async ({
  params,
  url,
  locals: { supabase, safeGetSession }
}) => {
  const requestedUsername = params.username.toLowerCase();

  // Redirect direct /user/profile/[username] to canonical /@username URL
  if (url.pathname.startsWith('/user/profile/')) {
    redirect(301, `/@${encodeURIComponent(requestedUsername)}`);
  }

  const { data: profileData, error: dbError } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url, created_at, rating, rating_games_played')
    .eq('username', requestedUsername)
    .maybeSingle();

  if (dbError) {
    logger.error(dbError, 'Failed to load public profile');
    error(500, { message: 'Failed to load user profile' });
  }

  if (!profileData) {
    error(404, { message: 'User not found' });
  }

  const canonicalPath = `/@${encodeURIComponent(profileData.username)}`;
  if (url.pathname !== canonicalPath) {
    redirect(301, canonicalPath);
  }

  const { user } = await safeGetSession();
  const games = await getPublicGameHistory(supabase, profileData.id);
  const stats = computeGameStats(games);
  const isOwnProfile = user?.id === profileData.id;

  // Determine relationship status for the "Add Friend" button
  let relationship: RelationshipStatus = 'none';
  if (user && !isOwnProfile) {
    const [userA, userB] = canonicalPair(user.id, profileData.id);
    const { data: friendship } = await supabase
      .from('friendships')
      .select('status, initiated_by')
      .eq('user_a', userA)
      .eq('user_b', userB)
      .maybeSingle();

    if (friendship) {
      if (friendship.status === 'accepted') {
        relationship = 'accepted';
      } else if (friendship.status === 'blocked') {
        relationship = 'blocked';
      } else if (friendship.status === 'pending') {
        relationship = friendship.initiated_by === user.id ? 'pending_sent' : 'pending_received';
      }
    }
  }

  return {
    profileDetail: {
      id: profileData.id,
      username: profileData.username,
      displayName: profileData.display_name,
      avatarUrl: profileData.avatar_url ?? null,
      createdAt: profileData.created_at ?? new Date().toISOString(),
      rating: profileData.rating as number | null,
      ratingGamesPlayed: (profileData.rating_games_played as number | null) ?? 0
    },
    stats,
    games,
    isOwnProfile,
    relationship,
    currentUserId: user?.id ?? null
  };
};

export const actions: Actions = {
  sendRequest: async ({ request, locals: { supabase, safeGetSession } }) => {
    const { user } = await safeGetSession();
    if (!user) return fail(401, { errors: { form: 'unauthorized' } });

    const formData = await request.formData();
    const toUserId = String(formData.get('toUserId') ?? '');
    if (!toUserId) return fail(400, { errors: { form: 'missingUserId' } });

    const result = await sendFriendRequest(supabase, user.id, toUserId);
    if (!result.success) {
      logger.error(
        new Error(result.error ?? 'Unknown'),
        'Failed to send friend request from profile'
      );
      return fail(400, { errors: { form: result.error ?? 'sendFailed' } });
    }

    return { success: true, action: 'sendRequest' as const };
  },

  sendChallenge: async ({ request, locals: { supabase, safeGetSession } }) => {
    const { user } = await safeGetSession();
    if (!user) return fail(401, { errors: { form: 'unauthorized' } });

    const formData = await request.formData();
    const toUserId = String(formData.get('toUserId') ?? '');
    let gameConfig: unknown;
    try {
      gameConfig = JSON.parse(String(formData.get('gameConfig') ?? ''));
    } catch {
      return fail(400, { errors: { form: 'invalidGameConfig' } });
    }

    if (!toUserId) return fail(400, { errors: { form: 'missingUserId' } });
    if (!validateGameConfig(gameConfig))
      return fail(400, { errors: { form: 'invalidGameConfig' } });

    const result = await sendInvitation(supabase, user.id, toUserId, gameConfig);
    if (!result.success) {
      logger.error(new Error(result.error ?? 'Unknown'), 'Failed to send challenge from profile');
      return fail(400, { errors: { form: result.error ?? 'sendFailed' } });
    }

    return { success: true, action: 'sendChallenge' as const };
  }
};
