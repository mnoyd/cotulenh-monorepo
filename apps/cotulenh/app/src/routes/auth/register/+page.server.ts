import { fail } from '@sveltejs/kit';
import { registerSchema } from './validation';
import type { Actions } from './$types';

export const actions: Actions = {
  default: async ({ request, locals: { supabase } }) => {
    const formData = await request.formData();
    const email = String(formData.get('email') ?? '');
    const password = String(formData.get('password') ?? '');
    const displayName = String(formData.get('displayName') ?? '');

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

    const { error } = await supabase.auth.signUp({
      email: result.data.email,
      password: result.data.password,
      options: {
        data: {
          display_name: normalizedDisplayName
        }
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

    return { success: true };
  }
};
