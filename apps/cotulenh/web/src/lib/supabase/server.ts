import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch (error) {
            if (isReadonlyCookieStoreError(error)) {
              return;
            }

            throw error;
          }
        }
      }
    }
  );
}

function isReadonlyCookieStoreError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  return (
    error.message.includes('Cookies can only be modified in a Server Action or Route Handler') ||
    error.message.includes('ReadonlyRequestCookies cannot be modified')
  );
}
