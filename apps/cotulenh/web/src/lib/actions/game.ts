'use server';

import { DEFAULT_POSITION } from '@cotulenh/core';

import { createClient } from '@/lib/supabase/server';
import type { GameData } from '@/lib/types/game';
import { createGameSchema, invitationGameConfigSchema } from '@/lib/validators/game';

type GetGameResult =
  | { success: true; data: GameData }
  | { success: false; error: 'not-found' | 'unauthorized' | 'server-error' };

export async function getGame(gameId: string): Promise<GetGameResult> {
  const supabase = await createClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'unauthorized' };
  }

  const { data: game, error: gameError } = await supabase
    .from('games')
    .select(
      `
      id,
      status,
      red_player,
      blue_player,
      is_rated,
      created_at,
      winner,
      result_reason,
      ended_at,
      game_states (
        move_history,
        fen,
        phase,
        clocks
      )
    `
    )
    .eq('id', gameId)
    .single();

  if (gameError || !game) {
    if (gameError?.code === 'PGRST116') {
      return { success: false, error: 'not-found' };
    }
    return { success: false, error: 'server-error' };
  }

  // Validate participant
  if (game.red_player !== user.id && game.blue_player !== user.id) {
    return { success: false, error: 'unauthorized' };
  }

  // Fetch player display names
  const { data: players } = await supabase
    .from('profiles')
    .select('id, display_name, rating')
    .in('id', [game.red_player, game.blue_player]);

  const playerMap = new Map<string, { display_name: string; rating: number }>();
  for (const p of players ?? []) {
    playerMap.set(p.id, { display_name: p.display_name ?? 'Nguoi choi', rating: p.rating ?? 1500 });
  }

  const redInfo = playerMap.get(game.red_player as string);
  const blueInfo = playerMap.get(game.blue_player as string);

  const gameState = Array.isArray(game.game_states) ? game.game_states[0] : game.game_states;

  const data: GameData = {
    id: game.id,
    status: game.status,
    red_player: {
      id: game.red_player as string,
      display_name: redInfo?.display_name ?? 'Nguoi choi',
      rating: redInfo?.rating ?? 1500
    },
    blue_player: {
      id: game.blue_player as string,
      display_name: blueInfo?.display_name ?? 'Nguoi choi',
      rating: blueInfo?.rating ?? 1500
    },
    my_color: game.red_player === user.id ? 'red' : 'blue',
    is_rated: game.is_rated,
    created_at: game.created_at,
    winner: game.winner ?? null,
    result_reason: game.result_reason ?? null,
    game_state: {
      move_history: gameState?.move_history ?? [],
      fen: gameState?.fen ?? 'start',
      phase: gameState?.phase ?? 'deploying',
      clocks: gameState?.clocks ?? { red: 600, blue: 600 }
    }
  };

  return { success: true, data };
}

type CreateGameResult =
  | { success: true; data: { gameId: string } }
  | { success: false; error: string };

export async function createGame(invitationId: string): Promise<CreateGameResult> {
  const supabase = await createClient();

  // Authenticate
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Vui lòng đăng nhập để tạo trận đấu' };
  }

  // Validate input
  const parsed = createGameSchema.safeParse({ invitationId });
  if (!parsed.success) {
    return { success: false, error: 'ID lời mời không hợp lệ' };
  }

  // Fetch invitation
  const { data: invitation, error: invError } = await supabase
    .from('game_invitations')
    .select('id, from_user, to_user, status, game_config')
    .eq('id', parsed.data.invitationId)
    .single();

  if (invError || !invitation) {
    return { success: false, error: 'Không tìm thấy lời mời' };
  }

  // Validate invitation status
  if (invitation.status !== 'accepted') {
    return { success: false, error: 'Lời mời chưa được chấp nhận' };
  }

  // Validate user is the recipient (acceptor creates game)
  if (invitation.to_user !== user.id) {
    return { success: false, error: 'Bạn không có quyền tạo trận đấu từ lời mời này' };
  }

  // Check no game already exists for this invitation
  const { data: existingGame } = await supabase
    .from('games')
    .select('id')
    .eq('invitation_id', parsed.data.invitationId)
    .maybeSingle();

  if (existingGame) {
    return { success: false, error: 'Trận đấu đã được tạo cho lời mời này' };
  }

  const parsedGameConfig = invitationGameConfigSchema.safeParse(invitation.game_config);
  if (!parsedGameConfig.success) {
    return { success: false, error: 'Cấu hình thời gian của lời mời không hợp lệ' };
  }

  // Atomic game + game_state creation via RPC
  const { data: gameId, error: rpcError } = await supabase.rpc('create_game_with_state', {
    p_invitation_id: invitation.id,
    p_fen: DEFAULT_POSITION
  });

  if (rpcError?.code === '23505') {
    return { success: false, error: 'Trận đấu đã được tạo cho lời mời này' };
  }

  if (rpcError || !gameId) {
    return { success: false, error: 'Không thể tạo trận đấu' };
  }

  return { success: true, data: { gameId } };
}
