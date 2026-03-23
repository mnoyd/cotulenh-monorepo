import {
  getPendingActionExpiryEvent,
  isPendingActionExpired,
  type PendingAction
} from './pending-action.ts';

export const REMATCH_TERMINAL_STATUSES = [
  'checkmate',
  'resign',
  'timeout',
  'stalemate',
  'draw'
] as const;

type RematchTerminalStatus = (typeof REMATCH_TERMINAL_STATUSES)[number];

type RematchSupabaseClient = {
  from: (table: string) => {
    update: (data: Record<string, unknown>) => {
      eq: (column: string, value: string) => Promise<{ error: unknown }>;
    };
  };
  channel: (name: string) => {
    send: (message: Record<string, unknown>) => Promise<unknown>;
  };
  rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
};

export type RematchGameState = {
  id: string;
  move_history: string[];
  pending_action: PendingAction;
};

type RematchSuccess = { ok: true; data: Record<string, unknown> };

type RematchFailure = {
  ok: false;
  error: string;
  code: string;
  status: number;
};

export type RematchResult = RematchSuccess | RematchFailure;

type RematchContext = {
  supabase: RematchSupabaseClient;
  gameId: string;
  gameState: RematchGameState;
};

function success(data: Record<string, unknown>): RematchSuccess {
  return { ok: true, data };
}

function failure(error: string, code: string, status: number): RematchFailure {
  return { ok: false, error, code, status };
}

export function isRematchTerminalStatus(status: string): status is RematchTerminalStatus {
  return (REMATCH_TERMINAL_STATUSES as readonly string[]).includes(status);
}

export async function expirePendingAction(
  context: RematchContext,
  pendingAction: Exclude<PendingAction, null>
): Promise<{ success: true; event: string } | { success: false }> {
  const { supabase, gameId, gameState } = context;
  const { error: clearPendingError } = await supabase
    .from('game_states')
    .update({ pending_action: null })
    .eq('id', gameState.id);

  if (clearPendingError) {
    return { success: false };
  }

  const expiryEvent = getPendingActionExpiryEvent(pendingAction);
  const expirySeq =
    pendingAction.type === 'rematch_offer'
      ? gameState.move_history.length + 1
      : gameState.move_history.length;

  await supabase.channel(`game:${gameId}`).send({
    type: 'broadcast',
    event: expiryEvent,
    payload: {
      type: expiryEvent,
      payload: {},
      seq: expirySeq
    }
  });

  return { success: true, event: expiryEvent };
}

export async function handleRematchOffer(
  context: RematchContext,
  playerColor: 'red' | 'blue'
): Promise<RematchResult> {
  const { supabase, gameId, gameState } = context;
  if (gameState.pending_action) {
    return failure('A pending action already exists', 'DUPLICATE_ACTION', 400);
  }

  const rematchOfferAction: Exclude<PendingAction, null> = {
    type: 'rematch_offer',
    color: playerColor,
    created_at: new Date().toISOString()
  };

  const { error: rematchOfferUpdateError } = await supabase
    .from('game_states')
    .update({ pending_action: rematchOfferAction })
    .eq('id', gameState.id);

  if (rematchOfferUpdateError) {
    return failure('Failed to store rematch offer', 'INTERNAL_ERROR', 500);
  }

  await supabase.channel(`game:${gameId}`).send({
    type: 'broadcast',
    event: 'rematch_offer',
    payload: {
      type: 'rematch_offer',
      payload: { offering_color: playerColor },
      seq: gameState.move_history.length + 1
    }
  });

  return success({ rematch_offer: true });
}

export async function handleRematchAccept(
  context: RematchContext,
  playerColor: 'red' | 'blue',
  defaultFen: string
): Promise<RematchResult> {
  const { supabase, gameId, gameState } = context;
  const pendingAction = gameState.pending_action;

  if (pendingAction && isPendingActionExpired(pendingAction)) {
    const expireResult = await expirePendingAction(context, pendingAction);
    if (!expireResult.success) {
      return failure('Failed to expire pending action', 'INTERNAL_ERROR', 500);
    }
    return failure('Rematch offer has expired', 'EXPIRED_ACTION', 409);
  }

  if (
    !pendingAction ||
    pendingAction.type !== 'rematch_offer' ||
    pendingAction.color === playerColor
  ) {
    return failure('No pending rematch offer from opponent', 'INVALID_ACTION', 400);
  }

  const { data: newGameId, error: rematchCreateError } = await supabase.rpc('create_rematch_game', {
    p_original_game_id: gameId,
    p_fen: defaultFen
  });

  if (rematchCreateError || typeof newGameId !== 'string' || newGameId.length === 0) {
    return failure('Failed to create rematch game', 'INTERNAL_ERROR', 500);
  }

  const { error: rematchAcceptClearError } = await supabase
    .from('game_states')
    .update({ pending_action: null })
    .eq('id', gameState.id);

  if (rematchAcceptClearError) {
    return failure('Failed to clear rematch offer', 'INTERNAL_ERROR', 500);
  }

  await supabase.channel(`game:${gameId}`).send({
    type: 'broadcast',
    event: 'rematch_accepted',
    payload: {
      type: 'rematch_accepted',
      payload: { new_game_id: newGameId },
      seq: gameState.move_history.length + 2
    }
  });

  return success({ rematch_accepted: true, new_game_id: newGameId });
}

export async function handleRematchDecline(
  context: RematchContext,
  playerColor: 'red' | 'blue'
): Promise<RematchResult> {
  const { supabase, gameId, gameState } = context;
  const pendingAction = gameState.pending_action;

  if (pendingAction && isPendingActionExpired(pendingAction)) {
    const expireResult = await expirePendingAction(context, pendingAction);
    if (!expireResult.success) {
      return failure('Failed to expire pending action', 'INTERNAL_ERROR', 500);
    }
    return failure('Rematch offer has expired', 'EXPIRED_ACTION', 409);
  }

  if (
    !pendingAction ||
    pendingAction.type !== 'rematch_offer' ||
    pendingAction.color === playerColor
  ) {
    return failure('No pending rematch offer from opponent', 'INVALID_ACTION', 400);
  }

  const { error: rematchDeclineClearError } = await supabase
    .from('game_states')
    .update({ pending_action: null })
    .eq('id', gameState.id);

  if (rematchDeclineClearError) {
    return failure('Failed to clear rematch offer', 'INTERNAL_ERROR', 500);
  }

  await supabase.channel(`game:${gameId}`).send({
    type: 'broadcast',
    event: 'rematch_declined',
    payload: {
      type: 'rematch_declined',
      payload: {},
      seq: gameState.move_history.length + 1
    }
  });

  return success({ rematch_declined: true });
}
