import { requireAuth } from '$lib/auth/guards';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, url }) => {
  // Public profile routes are accessible without authentication
  // Architecture: /user/profile/[username] is Public, /user/profile is Protected
  const isPublicProfile = /^\/user\/profile\/[^/]+$/.test(url.pathname);
  if (isPublicProfile) return {};

  await requireAuth(locals, url);
};
