import { requireAuth } from '$lib/auth/guards';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, url }) => {
  // Public profile routes are accessible without authentication
  // /@username is rewritten to /user/profile/[username] via reroute hook,
  // but url.pathname preserves the original /@username form
  const isPublicProfile =
    /^\/user\/profile\/[^/]+$/.test(url.pathname) || /^\/@[^/]+$/.test(url.pathname);
  if (isPublicProfile) return {};

  await requireAuth(locals, url);
};
