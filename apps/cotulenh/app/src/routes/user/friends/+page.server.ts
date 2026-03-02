import { fail, redirect } from '@sveltejs/kit';
import { logger } from '@cotulenh/common';
import {
  searchUsers,
  sendFriendRequest,
  getFriendsList,
  getPendingIncomingRequests,
  getPendingSentRequests,
  acceptFriendRequest,
  declineFriendRequest,
  cancelSentRequest,
  removeFriend
} from '$lib/friends/queries';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase, safeGetSession } }) => {
  const { user } = await safeGetSession();
  if (!user) redirect(303, '/auth/login');

  const [friends, incomingRequests, sentRequests] = await Promise.all([
    getFriendsList(supabase, user.id),
    getPendingIncomingRequests(supabase, user.id),
    getPendingSentRequests(supabase, user.id)
  ]);

  return { friends, incomingRequests, sentRequests };
};

export const actions: Actions = {
  search: async ({ request, locals: { supabase, safeGetSession } }) => {
    const { user } = await safeGetSession();
    if (!user) {
      return fail(401, { errors: { form: 'unauthorized' }, action: 'search' as const });
    }

    const formData = await request.formData();
    const query = String(formData.get('query') ?? '').trim();

    if (query.length < 2) {
      return { results: [], action: 'search' as const };
    }

    const results = await searchUsers(supabase, query, user.id);
    return { results, action: 'search' as const };
  },

  sendRequest: async ({ request, locals: { supabase, safeGetSession } }) => {
    const { user } = await safeGetSession();
    if (!user) {
      return fail(401, { errors: { form: 'unauthorized' }, action: 'sendRequest' as const });
    }

    const formData = await request.formData();
    const toUserId = String(formData.get('toUserId') ?? '');

    if (!toUserId) {
      return fail(400, {
        errors: { form: 'missingUserId' },
        action: 'sendRequest' as const
      });
    }

    const result = await sendFriendRequest(supabase, user.id, toUserId);

    if (!result.success) {
      logger.error(new Error(result.error ?? 'Unknown'), 'Failed to send friend request');
      return fail(400, {
        errors: { form: result.error ?? 'sendFailed' },
        action: 'sendRequest' as const
      });
    }

    return { success: true, action: 'sendRequest' as const };
  },

  acceptRequest: async ({ request, locals: { supabase, safeGetSession } }) => {
    const { user } = await safeGetSession();
    if (!user) {
      return fail(401, { errors: { form: 'unauthorized' }, action: 'acceptRequest' as const });
    }

    const formData = await request.formData();
    const friendshipId = String(formData.get('friendshipId') ?? '');

    if (!friendshipId) {
      return fail(400, {
        errors: { form: 'missingFriendshipId' },
        action: 'acceptRequest' as const
      });
    }

    const result = await acceptFriendRequest(supabase, friendshipId, user.id);

    if (!result.success) {
      logger.error(new Error(result.error ?? 'Unknown'), 'Failed to accept friend request');
      return fail(400, {
        errors: { form: result.error ?? 'acceptFailed' },
        action: 'acceptRequest' as const
      });
    }

    return { success: true, action: 'acceptRequest' as const };
  },

  declineRequest: async ({ request, locals: { supabase, safeGetSession } }) => {
    const { user } = await safeGetSession();
    if (!user) {
      return fail(401, { errors: { form: 'unauthorized' }, action: 'declineRequest' as const });
    }

    const formData = await request.formData();
    const friendshipId = String(formData.get('friendshipId') ?? '');

    if (!friendshipId) {
      return fail(400, {
        errors: { form: 'missingFriendshipId' },
        action: 'declineRequest' as const
      });
    }

    const result = await declineFriendRequest(supabase, friendshipId, user.id);

    if (!result.success) {
      logger.error(new Error(result.error ?? 'Unknown'), 'Failed to decline friend request');
      return fail(400, {
        errors: { form: result.error ?? 'declineFailed' },
        action: 'declineRequest' as const
      });
    }

    return { success: true, action: 'declineRequest' as const };
  },

  cancelRequest: async ({ request, locals: { supabase, safeGetSession } }) => {
    const { user } = await safeGetSession();
    if (!user) {
      return fail(401, { errors: { form: 'unauthorized' }, action: 'cancelRequest' as const });
    }

    const formData = await request.formData();
    const friendshipId = String(formData.get('friendshipId') ?? '');

    if (!friendshipId) {
      return fail(400, {
        errors: { form: 'missingFriendshipId' },
        action: 'cancelRequest' as const
      });
    }

    const result = await cancelSentRequest(supabase, friendshipId, user.id);

    if (!result.success) {
      logger.error(new Error(result.error ?? 'Unknown'), 'Failed to cancel friend request');
      return fail(400, {
        errors: { form: result.error ?? 'cancelFailed' },
        action: 'cancelRequest' as const
      });
    }

    return { success: true, action: 'cancelRequest' as const };
  },

  removeFriend: async ({ request, locals: { supabase, safeGetSession } }) => {
    const { user } = await safeGetSession();
    if (!user) {
      return fail(401, { errors: { form: 'unauthorized' }, action: 'removeFriend' as const });
    }

    const formData = await request.formData();
    const friendshipId = String(formData.get('friendshipId') ?? '');

    if (!friendshipId) {
      return fail(400, {
        errors: { form: 'missingFriendshipId' },
        action: 'removeFriend' as const
      });
    }

    const result = await removeFriend(supabase, friendshipId, user.id);

    if (!result.success) {
      logger.error(new Error(result.error ?? 'Unknown'), 'Failed to remove friend');
      return fail(400, {
        errors: { form: result.error ?? 'removeFailed' },
        action: 'removeFriend' as const
      });
    }

    return { success: true, action: 'removeFriend' as const };
  }
};
