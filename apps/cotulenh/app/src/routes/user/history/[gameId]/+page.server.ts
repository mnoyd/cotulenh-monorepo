import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals: { supabase, safeGetSession } }) => {
  const { user } = await safeGetSession();

  const { data: game, error: fetchError } = await supabase
    .from('games')
    .select(
      `
			id, pgn, status, winner, result_reason, time_control, started_at, ended_at,
			red_player, blue_player,
			red_profile:profiles!games_red_player_fkey(display_name),
			blue_profile:profiles!games_blue_player_fkey(display_name)
		`
    )
    .eq('id', params.gameId)
    .single();

  if (fetchError || !game) {
    throw error(404, 'Game not found');
  }

  // Only completed games can be replayed
  if (game.status === 'started') {
    throw error(404, 'Game not found');
  }

  const redProfile = game.red_profile as unknown as { display_name: string } | null;
  const blueProfile = game.blue_profile as unknown as { display_name: string } | null;

  return {
    game: {
      id: game.id,
      pgn: game.pgn ?? '',
      status: game.status,
      winner: game.winner as 'red' | 'blue' | null,
      resultReason: game.result_reason,
      timeControl: game.time_control as { timeMinutes: number; incrementSeconds: number },
      startedAt: game.started_at,
      endedAt: game.ended_at,
      redPlayer: {
        id: game.red_player,
        displayName: redProfile?.display_name ?? '???'
      },
      bluePlayer: {
        id: game.blue_player,
        displayName: blueProfile?.display_name ?? '???'
      }
    },
    currentUserId: user?.id ?? null
  };
};
