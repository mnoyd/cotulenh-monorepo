import { fail, redirect } from '@sveltejs/kit';
import { logger } from '@cotulenh/common';
import {
  getInvitationByCode,
  acceptInviteLink,
  createAutoFriendship
} from '$lib/invitations/queries';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
  const { user } = await locals.safeGetSession();
  const invitation = await getInvitationByCode(locals.supabase, params.code);

  if (!invitation) {
    return { invitation: null, isAuthenticated: !!user, isOwnInvitation: false };
  }

  return {
    invitation,
    isAuthenticated: !!user,
    isOwnInvitation: user?.id === invitation.fromUser.id
  };
};

export const actions: Actions = {
  acceptInviteLink: async ({ params, locals: { supabase, safeGetSession } }) => {
    const { user } = await safeGetSession();
    if (!user) {
      return fail(401, { errors: { form: 'unauthorized' }, action: 'acceptInviteLink' as const });
    }

    const result = await acceptInviteLink(supabase, params.code, user.id);

    if (!result.success) {
      logger.error(
        new Error(result.error ?? 'Unknown'),
        'Failed to accept invite link'
      );
      return fail(400, {
        errors: { form: result.error ?? 'acceptFailed' },
        action: 'acceptInviteLink' as const
      });
    }

    // Auto-friend the inviter and acceptor (non-blocking — game takes priority)
    if (result.inviterUserId) {
      const friendshipCreated = await createAutoFriendship(supabase, user.id, result.inviterUserId);
      if (!friendshipCreated) {
        logger.error(new Error('Auto-friendship failed'), 'Invite accept proceeding without friendship');
      }
    }

    redirect(303, `/play/online/${result.gameId}`);
  }
};
