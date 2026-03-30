import { calculateGlicko2, GLICKO2_DEFAULTS } from '@cotulenh/common';

export type GameEndStatus = 'checkmate' | 'stalemate' | 'timeout' | 'draw' | 'resign';

export type GameEndResult = {
  status: GameEndStatus;
  winner: 'red' | 'blue' | null;
  result_reason: string | null;
};

export type RatingChange = {
  old: number;
  new: number;
  delta: number;
};

type GameEndProbe = {
  isGameOver: () => boolean;
  isCheckmate: () => boolean;
  isCommanderCaptured: () => boolean;
  isStalemate: () => boolean;
  isDrawByFiftyMoves: () => boolean;
  isThreefoldRepetition: () => boolean;
};

type SupabaseClient = {
  from: (table: string) => {
    update: (data: Record<string, unknown>) => {
      eq: (col: string, val: string) => Promise<{ error: unknown }>;
    };
    select: (columns: string) => {
      eq: (
        col: string,
        val: unknown
      ) => {
        single: () => Promise<{ data: Record<string, unknown> | null; error: unknown }>;
      };
    };
  };
  rpc: (fn: string, params: Record<string, unknown>) => Promise<{ error: unknown }>;
  channel: (
    name: string,
    opts?: { config?: { private?: boolean } }
  ) => {
    send: (msg: Record<string, unknown>) => Promise<unknown>;
  };
};

export type GameData = {
  redPlayerId: string;
  bluePlayerId: string;
  isRated: boolean;
};

type PlayerRatingSnapshot = {
  rating: number;
  rd: number;
  volatility: number;
};

type QueryError = {
  code?: string;
  message?: string;
};

export function determineGameEndResult(
  engine: GameEndProbe,
  movingPlayerColor: 'red' | 'blue'
): GameEndResult | null {
  if (!engine.isGameOver()) {
    return null;
  }

  if (engine.isCheckmate() || engine.isCommanderCaptured()) {
    return { status: 'checkmate', winner: movingPlayerColor, result_reason: null };
  }

  if (engine.isStalemate()) {
    return { status: 'stalemate', winner: null, result_reason: null };
  }

  if (engine.isDrawByFiftyMoves()) {
    return { status: 'draw', winner: null, result_reason: 'fifty_move_rule' };
  }

  if (engine.isThreefoldRepetition()) {
    return { status: 'draw', winner: null, result_reason: 'threefold_repetition' };
  }

  return { status: 'draw', winner: null, result_reason: 'unknown' };
}

function getScore(winner: 'red' | 'blue' | null, playerColor: 'red' | 'blue'): number {
  if (winner === null) return 0.5;
  return winner === playerColor ? 1.0 : 0.0;
}

async function fetchRating(
  supabase: SupabaseClient,
  userId: string
): Promise<PlayerRatingSnapshot> {
  const { data, error } = await supabase
    .from('ratings')
    .select('rating, rating_deviation, volatility')
    .eq('user_id', userId)
    .single();

  const queryError = error as QueryError | null;
  const isMissingRow = queryError?.code === 'PGRST116' || queryError?.message === 'not found';
  if (queryError && !isMissingRow) {
    throw new Error(`Failed to fetch rating for ${userId}`);
  }

  if (data) {
    return {
      rating: data.rating as number,
      rd: data.rating_deviation as number,
      volatility: data.volatility as number
    };
  }

  return { ...GLICKO2_DEFAULTS };
}

export async function completeGame(
  supabase: SupabaseClient,
  gameId: string,
  endResult: GameEndResult,
  seq: number,
  gameData?: GameData
): Promise<{
  success: boolean;
  error?: string;
  ratingChanges?: { red: RatingChange; blue: RatingChange } | null;
}> {
  const { status, winner, result_reason } = endResult;

  const isRated = gameData?.isRated ?? false;
  let ratingChanges: { red: RatingChange; blue: RatingChange } | null = null;

  if (isRated && gameData) {
    // Fetch current ratings for both players
    let redRating: PlayerRatingSnapshot;
    let blueRating: PlayerRatingSnapshot;
    try {
      [redRating, blueRating] = await Promise.all([
        fetchRating(supabase, gameData.redPlayerId),
        fetchRating(supabase, gameData.bluePlayerId)
      ]);
    } catch {
      return { success: false, error: 'Failed to load ratings' };
    }

    // Calculate new ratings
    const redScore = getScore(winner, 'red');
    const blueScore = getScore(winner, 'blue');

    const newRedRating = calculateGlicko2(redRating, blueRating, redScore);
    const newBlueRating = calculateGlicko2(blueRating, redRating, blueScore);

    ratingChanges = {
      red: {
        old: redRating.rating,
        new: newRedRating.rating,
        delta: newRedRating.rating - redRating.rating
      },
      blue: {
        old: blueRating.rating,
        new: newBlueRating.rating,
        delta: newBlueRating.rating - blueRating.rating
      }
    };

    // Atomic RPC: update game + ratings in one transaction
    const { error: rpcError } = await supabase.rpc('complete_game_with_ratings', {
      p_game_id: gameId,
      p_status: status,
      p_winner: winner,
      p_result_reason: result_reason,
      p_is_rated: true,
      p_red_player_id: gameData.redPlayerId,
      p_blue_player_id: gameData.bluePlayerId,
      p_red_new_rating: newRedRating.rating,
      p_red_new_rd: newRedRating.rd,
      p_red_new_volatility: newRedRating.volatility,
      p_blue_new_rating: newBlueRating.rating,
      p_blue_new_rd: newBlueRating.rd,
      p_blue_new_volatility: newBlueRating.volatility
    });

    if (rpcError) {
      return { success: false, error: 'Failed to complete rated game' };
    }
  } else {
    // Casual game or no game data — simple game update (no ratings)
    if (gameData) {
      // Use RPC for consistency but without rating params
      const { error: rpcError } = await supabase.rpc('complete_game_with_ratings', {
        p_game_id: gameId,
        p_status: status,
        p_winner: winner,
        p_result_reason: result_reason,
        p_is_rated: false,
        p_red_player_id: gameData.redPlayerId,
        p_blue_player_id: gameData.bluePlayerId
      });

      if (rpcError) {
        return { success: false, error: 'Failed to complete game' };
      }
    } else {
      // Legacy path: direct update (backwards compatibility during migration)
      const { error: updateError } = await supabase
        .from('games')
        .update({
          status,
          winner,
          result_reason,
          ended_at: new Date().toISOString()
        })
        .eq('id', gameId);

      if (updateError) {
        return { success: false, error: 'Failed to complete game' };
      }
    }
  }

  // Broadcast game_end event
  const channel = supabase.channel(`game:${gameId}`, { config: { private: true } });
  await channel.send({
    type: 'broadcast',
    event: 'game_end',
    payload: {
      type: 'game_end',
      payload: {
        status,
        winner,
        result_reason,
        rating_changes: ratingChanges
      },
      seq
    }
  });

  return { success: true, ratingChanges };
}
