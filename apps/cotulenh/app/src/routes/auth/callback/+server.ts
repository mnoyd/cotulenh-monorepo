import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals: { supabase } }) => {
  const token_hash = url.searchParams.get('token_hash');
  const type = url.searchParams.get('type') as
    | 'email'
    | 'recovery'
    | 'invite'
    | 'magiclink'
    | 'signup';
  const next = url.searchParams.get('next') ?? '/';

  // Prevent open redirect — only allow relative paths
  const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/';

  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash, type });
    if (!error) {
      redirect(303, safeNext);
    }
  }

  redirect(303, '/auth/error');
};
