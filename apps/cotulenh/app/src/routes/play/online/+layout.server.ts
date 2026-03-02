import { requireAuth } from '$lib/auth/guards';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, url }) => {
  // Skip auth for public invite link pages (Story 4.3)
  if (url.pathname.startsWith('/play/online/invite/')) {
    return;
  }
  await requireAuth(locals, url);
};
