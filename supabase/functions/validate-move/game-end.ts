export type GameEndStatus = 'checkmate' | 'stalemate' | 'timeout' | 'draw' | 'resign';

export type GameEndResult = {
  status: GameEndStatus;
  winner: 'red' | 'blue' | null;
  result_reason: string | null;
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
  };
  channel: (
    name: string,
    opts?: { config?: { private?: boolean } }
  ) => {
    send: (msg: Record<string, unknown>) => Promise<unknown>;
  };
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

export async function completeGame(
  supabase: SupabaseClient,
  gameId: string,
  endResult: GameEndResult,
  seq: number
): Promise<{ success: boolean; error?: string }> {
  const { status, winner, result_reason } = endResult;

  // Atomic update of games table
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

  // Broadcast game_end event
  const channel = supabase.channel(`game:${gameId}`, { config: { private: true } });
  await channel.send({
    type: 'broadcast',
    event: 'game_end',
    payload: {
      type: 'game_end',
      payload: { status, winner, result_reason },
      seq
    }
  });

  return { success: true };
}
