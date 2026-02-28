import { redirect, fail } from '@sveltejs/kit';
import { resetPasswordSchema } from './validation';
import type { PageServerLoad, Actions } from './$types';
import { logger } from '@cotulenh/common';

export const load: PageServerLoad = async ({ locals: { safeGetSession } }) => {
  const { user } = await safeGetSession();
  if (!user) {
    redirect(303, '/auth/forgot-password?expired=true');
  }
  return {};
};

export const actions: Actions = {
  default: async ({ request, locals: { supabase } }) => {
    const formData = await request.formData();
    const password = formData.get('password') as string;
    const confirmPassword = formData.get('confirmPassword') as string;

    const result = resetPasswordSchema.safeParse({ password, confirmPassword });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as string;
        if (!fieldErrors[field]) fieldErrors[field] = issue.message;
      }
      return fail(400, { errors: fieldErrors });
    }

    const { error } = await supabase.auth.updateUser({ password: result.data.password });
    if (error) {
      logger.error(error, 'Password update error');
      return fail(400, { errors: { form: 'resetFailed' } });
    }

    redirect(303, '/auth/login?message=password-reset-success');
  }
};
