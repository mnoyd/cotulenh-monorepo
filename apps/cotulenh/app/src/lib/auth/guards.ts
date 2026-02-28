import { redirect } from '@sveltejs/kit';

export function isRelativePath(path: string): boolean {
  return path.startsWith('/') && !path.startsWith('//') && !path.includes('://');
}

export async function requireAuth(locals: App.Locals, url: URL): Promise<void> {
  const { user } = await locals.safeGetSession();
  if (!user) {
    const redirectTo = url.pathname;
    const safeRedirect = isRelativePath(redirectTo) ? redirectTo : '/';
    redirect(303, `/auth/login?redirectTo=${encodeURIComponent(safeRedirect)}`);
  }
}
