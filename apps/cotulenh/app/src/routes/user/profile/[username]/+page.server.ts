import { error } from '@sveltejs/kit';
import { logger } from '@cotulenh/common';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals: { supabase } }) => {
  const displayName = params.username;

  const { data: profileData, error: dbError } = await supabase
    .from('profiles')
    .select('display_name, avatar_url, created_at')
    .eq('display_name', displayName)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (dbError) {
    logger.error(dbError, 'Failed to load public profile');
    error(500, { message: 'Failed to load user profile' });
  }

  if (!profileData) {
    error(404, { message: 'User not found' });
  }

  return {
    profileDetail: {
      displayName: profileData.display_name,
      avatarUrl: profileData.avatar_url ?? null,
      createdAt: profileData.created_at ?? new Date().toISOString()
    },
    stats: {
      gamesPlayed: 0,
      wins: 0,
      losses: 0
    }
  };
};
