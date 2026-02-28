import { requireAuth } from '$lib/auth/guards';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, url }) => {
  await requireAuth(locals, url);
};
