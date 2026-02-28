import { fail, redirect } from '@sveltejs/kit';
import { loginSchema } from './validation';
import type { Actions, PageServerLoad } from './$types';

function isRelativePath(path: string): boolean {
  return path.startsWith('/') && !path.startsWith('//') && !path.includes('://');
}

export const load: PageServerLoad = async ({ locals: { safeGetSession } }) => {
  const { session } = await safeGetSession();
  if (session) {
    redirect(303, '/');
  }
};

export const actions: Actions = {
  default: async ({ request, url, locals: { supabase } }) => {
    const formData = await request.formData();
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    const result = loginSchema.safeParse({ email, password });

    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as string;
        if (!fieldErrors[field]) {
          fieldErrors[field] = issue.message;
        }
      }
      return fail(400, { errors: fieldErrors, email });
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: result.data.email,
      password: result.data.password
    });

    if (error) {
      return fail(400, {
        errors: { form: 'loginFailed' },
        email: result.data.email
      });
    }

    const redirectTo = url.searchParams.get('redirectTo');
    if (redirectTo && isRelativePath(redirectTo)) {
      redirect(303, redirectTo);
    }

    redirect(303, '/');
  }
};
