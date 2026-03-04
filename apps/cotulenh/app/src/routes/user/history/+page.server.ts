import type { PageServerLoad } from './$types';
import { getGameHistory } from '$lib/game/history';

export const load: PageServerLoad = async ({ locals: { supabase, safeGetSession } }) => {
  const { user } = await safeGetSession();
  // No auth redirect needed — /user/+layout.server.ts handles it

  const games = await getGameHistory(supabase, user!.id);

  return { games };
};
