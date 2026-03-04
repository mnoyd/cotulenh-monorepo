import { fail } from '@sveltejs/kit';
import { forgotPasswordSchema } from './validation';
import type { Actions } from './$types';
import { logger } from '@cotulenh/common';

export const actions: Actions = {
  default: async ({ request, url, locals: { supabase } }) => {
    const formData = await request.formData();
    const email = String(formData.get('email') ?? '');

    const result = forgotPasswordSchema.safeParse({ email });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as string;
        if (!fieldErrors[field]) fieldErrors[field] = issue.message;
      }
      return fail(400, { errors: fieldErrors, email });
    }

    // Always show success regardless of whether email exists (enumeration prevention)
    const { error } = await supabase.auth.resetPasswordForEmail(result.data.email, {
      redirectTo: `${url.origin}/auth/callback?next=/auth/reset-password`
    });

    if (error) {
      logger.error(error, 'Password reset email error');
    }

    return { success: true };
  }
};
