import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals: { supabase, safeGetSession } }) => {
  const { user } = await safeGetSession();
  if (!user) throw redirect(303, '/auth/login');

  const { data: game, error: fetchError } = await supabase
    .from('games')
    .select('id, red_player, blue_player, status, time_control, started_at')
    .eq('id', params.gameId)
    .single();

  if (fetchError || !game) {
    throw error(404, 'Game not found');
  }

  // Verify current user is a player in this game
  if (game.red_player !== user.id && game.blue_player !== user.id) {
    throw error(403, 'Not a player in this game');
  }

  // Get both player profiles
  const opponentId = game.red_player === user.id ? game.blue_player : game.red_player;
  const [{ data: opponentProfile }, { data: currentUserProfile }] = await Promise.all([
    supabase.from('profiles').select('display_name').eq('id', opponentId).single(),
    supabase.from('profiles').select('display_name').eq('id', user.id).single()
  ]);

  const playerColor = game.red_player === user.id ? 'red' : 'blue';
  const currentDisplayName = currentUserProfile?.display_name ?? user.email ?? 'Player';
  const opponentDisplayName = opponentProfile?.display_name ?? 'Opponent';

  return {
    game: {
      id: game.id,
      status: game.status,
      timeControl: game.time_control as { timeMinutes: number; incrementSeconds: number },
      startedAt: game.started_at
    },
    currentUserId: user.id,
    playerColor,
    currentDisplayName,
    opponent: {
      id: opponentId,
      displayName: opponentDisplayName
    }
  };
};
