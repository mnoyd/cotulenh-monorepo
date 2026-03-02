import { fail, redirect } from '@sveltejs/kit';
import { logger } from '@cotulenh/common';
import { searchUsers, sendFriendRequest, getFriendsList } from '$lib/friends/queries';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase, safeGetSession } }) => {
  const { user } = await safeGetSession();
  if (!user) redirect(303, '/auth/login');

  const friends = await getFriendsList(supabase, user.id);

  return { friends };
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
  }
};
