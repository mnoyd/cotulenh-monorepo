import { redirect } from '@sveltejs/kit';
import type { Actions } from './$types';
import { logger } from '@cotulenh/common';

export const actions: Actions = {
  default: async ({ locals: { supabase } }) => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      logger.error(error, 'Sign out error');
    }
    redirect(303, '/');
  }
};
