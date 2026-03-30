import { fail, redirect } from '@sveltejs/kit';
import { displayNameSchema } from './validation';
import type { Actions, PageServerLoad } from './$types';
import { getPublicGameHistory, computeGameStats } from '$lib/game/history';

export const load: PageServerLoad = async ({ locals: { supabase, safeGetSession } }) => {
  const { user } = await safeGetSession();
  if (!user) redirect(303, '/auth/login');

  const { data: profileData } = await supabase
    .from('profiles')
    .select('username, display_name, avatar_url, created_at, rating, rating_games_played')
    .eq('id', user.id)
    .single();

  const games = await getPublicGameHistory(supabase, user.id);
  const stats = computeGameStats(games);

  return {
    profileDetail: {
      username: profileData?.username ?? '',
      displayName: profileData?.display_name ?? '',
      avatarUrl: profileData?.avatar_url ?? null,
      createdAt: profileData?.created_at ?? new Date().toISOString(),
      rating: (profileData?.rating as number | null) ?? null,
      ratingGamesPlayed: (profileData?.rating_games_played as number | null) ?? 0
    },
    stats
  };
};

export const actions: Actions = {
  default: async ({ request, locals: { supabase, safeGetSession } }) => {
    const { user } = await safeGetSession();
    if (!user) {
      return fail(401, { errors: { form: 'unauthorized' } });
    }

    const formData = await request.formData();
    const displayName = String(formData.get('displayName') ?? '');

    const result = displayNameSchema.safeParse({ displayName });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as string;
        if (!fieldErrors[field]) {
          fieldErrors[field] = issue.message;
        }
      }
      return fail(400, { errors: fieldErrors, displayName });
    }

    const normalizedDisplayName = result.data.displayName;

    const { error } = await supabase
      .from('profiles')
      .update({ display_name: normalizedDisplayName, updated_at: new Date().toISOString() })
      .eq('id', user.id);

    if (error) {
      return fail(500, { errors: { form: 'updateFailed' }, displayName: normalizedDisplayName });
    }

    return { success: true };
  }
};
