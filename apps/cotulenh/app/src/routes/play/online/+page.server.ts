import { fail, redirect } from '@sveltejs/kit';
import { logger } from '@cotulenh/common';
import { getFriendsList } from '$lib/friends/queries';
import {
  sendInvitation,
  getSentInvitations,
  getReceivedInvitations,
  cancelInvitation,
  acceptInvitation,
  declineInvitation,
  validateGameConfig,
  createShareableInvitation
} from '$lib/invitations/queries';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase, safeGetSession } }) => {
  const { user } = await safeGetSession();
  if (!user) redirect(303, '/auth/login');

  const [friends, sentInvitations, receivedInvitations] = await Promise.all([
    getFriendsList(supabase, user.id),
    getSentInvitations(supabase, user.id),
    getReceivedInvitations(supabase, user.id)
  ]);

  return { friends, sentInvitations, receivedInvitations };
};

export const actions: Actions = {
  sendInvitation: async ({ request, locals: { supabase, safeGetSession } }) => {
    const { user } = await safeGetSession();
    if (!user) {
      return fail(401, { errors: { form: 'unauthorized' }, action: 'sendInvitation' as const });
    }

    const formData = await request.formData();
    const toUserId = String(formData.get('toUserId') ?? '');
    let gameConfig: unknown;
    try {
      gameConfig = JSON.parse(String(formData.get('gameConfig') ?? ''));
    } catch {
      return fail(400, {
        errors: { form: 'invalidGameConfig' },
        action: 'sendInvitation' as const
      });
    }

    if (!toUserId) {
      return fail(400, {
        errors: { form: 'missingUserId' },
        action: 'sendInvitation' as const
      });
    }

    if (!validateGameConfig(gameConfig)) {
      return fail(400, {
        errors: { form: 'invalidGameConfig' },
        action: 'sendInvitation' as const
      });
    }

    const result = await sendInvitation(supabase, user.id, toUserId, gameConfig);

    if (!result.success) {
      logger.error(new Error(result.error ?? 'Unknown'), 'Failed to send match invitation');
      return fail(400, {
        errors: { form: result.error ?? 'sendFailed' },
        action: 'sendInvitation' as const
      });
    }

    return { success: true, action: 'sendInvitation' as const };
  },

  cancelInvitation: async ({ request, locals: { supabase, safeGetSession } }) => {
    const { user } = await safeGetSession();
    if (!user) {
      return fail(401, {
        errors: { form: 'unauthorized' },
        action: 'cancelInvitation' as const
      });
    }

    const formData = await request.formData();
    const invitationId = String(formData.get('invitationId') ?? '');

    if (!invitationId) {
      return fail(400, {
        errors: { form: 'missingInvitationId' },
        action: 'cancelInvitation' as const
      });
    }

    const result = await cancelInvitation(supabase, invitationId, user.id);

    if (!result.success) {
      logger.error(new Error(result.error ?? 'Unknown'), 'Failed to cancel match invitation');
      return fail(400, {
        errors: { form: result.error ?? 'cancelFailed' },
        action: 'cancelInvitation' as const
      });
    }

    return { success: true, action: 'cancelInvitation' as const };
  },

  acceptInvitation: async ({ request, locals: { supabase, safeGetSession } }) => {
    const { user } = await safeGetSession();
    if (!user) {
      return fail(401, {
        errors: { form: 'unauthorized' },
        action: 'acceptInvitation' as const
      });
    }

    const formData = await request.formData();
    const invitationId = String(formData.get('invitationId') ?? '');

    if (!invitationId) {
      return fail(400, {
        errors: { form: 'missingInvitationId' },
        action: 'acceptInvitation' as const
      });
    }

    const result = await acceptInvitation(supabase, invitationId, user.id);

    if (!result.success) {
      logger.error(new Error(result.error ?? 'Unknown'), 'Failed to accept match invitation');
      return fail(400, {
        errors: { form: result.error ?? 'acceptFailed' },
        action: 'acceptInvitation' as const
      });
    }

    return { success: true, action: 'acceptInvitation' as const, gameId: result.gameId };
  },

  declineInvitation: async ({ request, locals: { supabase, safeGetSession } }) => {
    const { user } = await safeGetSession();
    if (!user) {
      return fail(401, {
        errors: { form: 'unauthorized' },
        action: 'declineInvitation' as const
      });
    }

    const formData = await request.formData();
    const invitationId = String(formData.get('invitationId') ?? '');

    if (!invitationId) {
      return fail(400, {
        errors: { form: 'missingInvitationId' },
        action: 'declineInvitation' as const
      });
    }

    const result = await declineInvitation(supabase, invitationId, user.id);

    if (!result.success) {
      logger.error(new Error(result.error ?? 'Unknown'), 'Failed to decline match invitation');
      return fail(400, {
        errors: { form: result.error ?? 'declineFailed' },
        action: 'declineInvitation' as const
      });
    }

    return { success: true, action: 'declineInvitation' as const };
  },

  createShareableInvitation: async ({ request, locals: { supabase, safeGetSession } }) => {
    const { user } = await safeGetSession();
    if (!user) {
      return fail(401, {
        errors: { form: 'unauthorized' },
        action: 'createShareableInvitation' as const
      });
    }

    const formData = await request.formData();
    let gameConfig: unknown;
    try {
      gameConfig = JSON.parse(String(formData.get('gameConfig') ?? ''));
    } catch {
      return fail(400, {
        errors: { form: 'invalidGameConfig' },
        action: 'createShareableInvitation' as const
      });
    }

    if (!validateGameConfig(gameConfig)) {
      return fail(400, {
        errors: { form: 'invalidGameConfig' },
        action: 'createShareableInvitation' as const
      });
    }

    const result = await createShareableInvitation(supabase, user.id, gameConfig);

    if (!result.success) {
      logger.error(
        new Error(result.error ?? 'Unknown'),
        'Failed to create shareable invitation'
      );
      return fail(400, {
        errors: { form: result.error ?? 'createFailed' },
        action: 'createShareableInvitation' as const
      });
    }

    return {
      success: true,
      action: 'createShareableInvitation' as const,
      inviteCode: result.inviteCode
    };
  }
};
