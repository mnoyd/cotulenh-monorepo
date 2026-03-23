import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals: { supabase, safeGetSession } }) => {
  const { user } = await safeGetSession();
  if (!user) throw redirect(303, '/auth/login');

  const [{ data: game, error: fetchError }, { data: gameState, error: stateError }] =
    await Promise.all([
      supabase
        .from('games')
        .select(
          'id, red_player, blue_player, status, time_control, started_at, winner, result_reason'
        )
        .eq('id', params.gameId)
        .single(),
      supabase
        .from('game_states')
        .select(
          'move_history, fen, phase, clocks, disconnect_red_at, disconnect_blue_at, clocks_paused'
        )
        .eq('game_id', params.gameId)
        .single()
    ]);

  if (fetchError || !game) {
    throw error(404, 'Game not found');
  }

  if (stateError || !gameState) {
    throw error(404, 'Game state not found');
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
      startedAt: game.started_at,
      winner: game.winner,
      resultReason: game.result_reason
    },
    gameState: {
      moveHistory: gameState.move_history as string[],
      fen: gameState.fen,
      phase: gameState.phase,
      clocks: gameState.clocks as { red: number; blue: number },
      disconnectRedAt: gameState.disconnect_red_at,
      disconnectBlueAt: gameState.disconnect_blue_at,
      clocksPaused: gameState.clocks_paused
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
