import { fail } from '@sveltejs/kit';
import { isRelativePath } from '$lib/auth/guards';
import { registerSchema } from './validation';
import type { Actions } from './$types';

export const actions: Actions = {
  default: async ({ request, url, locals: { supabase } }) => {
    const formData = await request.formData();
    const email = String(formData.get('email') ?? '');
    const password = String(formData.get('password') ?? '');
    const displayName = String(formData.get('displayName') ?? '');
    const redirectTo = String(formData.get('redirectTo') ?? '');

    const result = registerSchema.safeParse({ email, password, displayName });

    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as string;
        if (!fieldErrors[field]) {
          fieldErrors[field] = issue.message;
        }
      }
      return fail(400, { errors: fieldErrors, email, displayName });
    }

    const normalizedDisplayName = result.data.displayName;

    // Build emailRedirectTo for post-verification redirect
    const safeRedirectTo = redirectTo && isRelativePath(redirectTo) ? redirectTo : '';
    const emailRedirectTo = safeRedirectTo
      ? `${url.origin}/auth/callback?next=${encodeURIComponent(safeRedirectTo)}`
      : undefined;

    const { error } = await supabase.auth.signUp({
      email: result.data.email,
      password: result.data.password,
      options: {
        data: {
          display_name: normalizedDisplayName
        },
        ...(emailRedirectTo ? { emailRedirectTo } : {})
      }
    });

    if (error) {
      // Return generic error to prevent email enumeration
      return fail(400, {
        errors: { form: 'registrationFailed' },
        email: result.data.email,
        displayName: normalizedDisplayName
      });
    }

    return { success: true, redirectTo: safeRedirectTo };
  }
};
