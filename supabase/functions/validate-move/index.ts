import { CoTuLenh, DEFAULT_POSITION } from '@cotulenh/core';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { applyElapsedAndIncrement } from './clock.ts';
import { completeGame, determineGameEndResult } from './game-end.ts';
import {
  expirePendingAction,
  handleRematchAccept,
  handleRematchDecline,
  handleRematchOffer,
  isRematchTerminalStatus
} from './rematch.ts';
import { isPendingActionExpired, type PendingAction } from './pending-action.ts';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
  });
}

function errorResponse(error: string, code: string, status: number) {
  return jsonResponse({ error, code }, status);
}

type DeployState = {
  red?: string[];
  blue?: string[];
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 'METHOD_NOT_ALLOWED', 405);
  }

  try {
    // 1.3: JWT auth extraction
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return errorResponse('Missing authorization', 'UNAUTHORIZED', 401);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Create authenticated client to get user
    const supabaseAuth = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    });

    const {
      data: { user },
      error: authError
    } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return errorResponse('Invalid token', 'UNAUTHORIZED', 401);
    }

    // Service role client for DB writes (bypasses RLS)
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const body = await req.json();
    const { game_id, sans, san, action, pending_type, claiming_color } = body as {
      game_id?: string;
      sans?: string[];
      san?: string;
      action?: string;
      pending_type?: 'draw_offer' | 'takeback_request' | 'rematch_offer';
      claiming_color?: 'red' | 'blue';
    };

    if (!game_id || typeof game_id !== 'string') {
      return errorResponse('Missing game_id', 'INVALID_INPUT', 400);
    }

    // Playing phase sends single `san`; deploy phase sends `sans` array
    const isPlayingMove = typeof san === 'string' && san.length > 0;
    const isTimeoutClaim = action === 'timeout_claim';
    const isResign = action === 'resign';
    const isDrawOffer = action === 'draw_offer';
    const isDrawAccept = action === 'draw_accept';
    const isDrawDecline = action === 'draw_decline';
    const isTakebackRequest = action === 'takeback_request';
    const isTakebackAccept = action === 'takeback_accept';
    const isTakebackDecline = action === 'takeback_decline';
    const isPendingActionExpire = action === 'expire_pending_action';
    const isRematchOffer = action === 'rematch_offer';
    const isRematchAccept = action === 'rematch_accept';
    const isRematchDecline = action === 'rematch_decline';
    const isRematchAction = isRematchOffer || isRematchAccept || isRematchDecline;
    const isRematchPendingExpiry = isPendingActionExpire && pending_type === 'rematch_offer';
    const isGameAction =
      isResign ||
      isDrawOffer ||
      isDrawAccept ||
      isDrawDecline ||
      isTakebackRequest ||
      isTakebackAccept ||
      isTakebackDecline ||
      isPendingActionExpire ||
      isRematchAction;

    if (!isPlayingMove && !isTimeoutClaim && !isGameAction) {
      if (
        !Array.isArray(sans) ||
        sans.length === 0 ||
        !sans.every((s: unknown) => typeof s === 'string')
      ) {
        return errorResponse('Invalid sans array', 'INVALID_INPUT', 400);
      }
    }

    // 1.10: Verify game status is 'started'
    const { data: gameRow, error: gameError } = await supabase
      .from('games')
      .select('id, status, red_player, blue_player, time_control')
      .eq('id', game_id)
      .single();

    if (gameError || !gameRow) {
      return errorResponse('Game not found', 'NOT_FOUND', 404);
    }

    if (isRematchAction || isRematchPendingExpiry) {
      if (!isRematchTerminalStatus(gameRow.status)) {
        return errorResponse('Rematch only available for ended games', 'INVALID_ACTION', 400);
      }
    } else if (gameRow.status !== 'started') {
      return errorResponse('Game has ended', 'GAME_ENDED', 409);
    }

    // 1.3: Participant verification
    const isRedPlayer = gameRow.red_player === user.id;
    const isBluePlayer = gameRow.blue_player === user.id;
    if (!isRedPlayer && !isBluePlayer) {
      return errorResponse('Not a participant', 'FORBIDDEN', 403);
    }

    const playerColor: 'red' | 'blue' = isRedPlayer ? 'red' : 'blue';
    const colorCode: 'r' | 'b' = isRedPlayer ? 'r' : 'b';

    // 1.4: SELECT FOR UPDATE row lock on game_states for concurrency safety
    const { data: stateRows, error: stateError } = await supabase.rpc(
      'lock_game_state_for_update',
      { p_game_id: game_id }
    );

    if (stateError || !stateRows || stateRows.length === 0) {
      return errorResponse('Game state not found', 'NOT_FOUND', 404);
    }

    const gameState: {
      id: string;
      move_history: string[];
      fen: string;
      deploy_state: DeployState | null;
      phase: string;
      clocks: { red: number; blue: number } | null;
      updated_at: string | null;
      pending_action: PendingAction;
    } = stateRows[0];

    if (isPendingActionExpire) {
      const isRematchExpiry = pending_type === 'rematch_offer';
      if (!isRematchExpiry && gameState.phase !== 'playing') {
        return errorResponse(
          'Can only expire pending actions during playing phase',
          'PHASE_MISMATCH',
          400
        );
      }

      const expiringPending = gameState.pending_action;
      if (!expiringPending || (pending_type && expiringPending.type !== pending_type)) {
        return jsonResponse({ data: { expired: false } });
      }

      if (!isPendingActionExpired(expiringPending)) {
        return jsonResponse({ data: { expired: false } });
      }

      const expireResult = await expirePendingAction(
        { supabase, gameId: game_id, gameState },
        expiringPending
      );
      if (!expireResult.success) {
        return errorResponse('Failed to expire pending action', 'INTERNAL_ERROR', 500);
      }

      return jsonResponse({ data: { expired: true, type: expiringPending.type } });
    }

    // === REMATCH OFFER HANDLING (Story 3.8: AC #1, #5, #7) ===
    if (isRematchOffer) {
      const result = await handleRematchOffer(
        { supabase, gameId: game_id, gameState },
        playerColor
      );
      if (!result.ok) {
        return errorResponse(result.error, result.code, result.status);
      }
      return jsonResponse({ data: result.data });
    }

    // === REMATCH ACCEPT HANDLING (Story 3.8: AC #2) ===
    if (isRematchAccept) {
      const result = await handleRematchAccept(
        { supabase, gameId: game_id, gameState },
        playerColor,
        DEFAULT_POSITION
      );
      if (!result.ok) {
        return errorResponse(result.error, result.code, result.status);
      }
      return jsonResponse({ data: result.data });
    }

    // === REMATCH DECLINE HANDLING (Story 3.8: AC #3) ===
    if (isRematchDecline) {
      const result = await handleRematchDecline(
        { supabase, gameId: game_id, gameState },
        playerColor
      );
      if (!result.ok) {
        return errorResponse(result.error, result.code, result.status);
      }
      return jsonResponse({ data: result.data });
    }

    // === TIMEOUT CLAIM HANDLING (Task 2: AC #4) ===
    if (isTimeoutClaim) {
      if (!claiming_color || (claiming_color !== 'red' && claiming_color !== 'blue')) {
        return errorResponse('Invalid claiming_color', 'INVALID_INPUT', 400);
      }

      // Claimant must be a participant and claiming their own color
      if (claiming_color !== playerColor) {
        return errorResponse('Can only claim timeout for yourself', 'FORBIDDEN', 403);
      }

      const tcClocks = gameState.clocks ?? { red: 0, blue: 0 };
      const tcUpdatedAt = gameState.updated_at
        ? new Date(gameState.updated_at).getTime()
        : Date.now();
      const tcElapsed = Math.max(0, Date.now() - tcUpdatedAt);

      // Determine whose turn it is from move history
      const tcEngine = new CoTuLenh(DEFAULT_POSITION);
      for (const historySan of gameState.move_history) {
        tcEngine.move(historySan);
      }
      const activeTurn = tcEngine.turn(); // 'r' | 'b'
      const activePlayerColor = activeTurn === 'r' ? 'red' : 'blue';

      // Only the active player's clock is ticking
      const opponentColor: 'red' | 'blue' = playerColor === 'red' ? 'blue' : 'red';
      const activePlayerClock = activePlayerColor === 'red' ? tcClocks.red : tcClocks.blue;
      const recalculatedClock =
        activePlayerColor === opponentColor ? activePlayerClock - tcElapsed : activePlayerClock; // Claimant's opponent must be the active player

      if (activePlayerColor !== opponentColor) {
        // The opponent is not the active player, so their clock isn't ticking
        return errorResponse('Opponent clock is not active', 'INVALID_CLAIM', 400);
      }

      if (recalculatedClock <= 0) {
        // Opponent's time has expired — claimant wins
        const tcSeq = gameState.move_history.length + 1;
        const endResult = await completeGame(
          supabase as never,
          game_id,
          { status: 'timeout', winner: playerColor, result_reason: null },
          tcSeq
        );

        if (!endResult.success) {
          return errorResponse('Failed to complete game', 'INTERNAL_ERROR', 500);
        }

        return jsonResponse({ data: { status: 'timeout', winner: playerColor } });
      } else {
        // Clock not expired — broadcast correction
        const channel = supabase.channel(`game:${game_id}`);
        const correctedClocks = {
          red: activePlayerColor === 'red' ? recalculatedClock : tcClocks.red,
          blue: activePlayerColor === 'blue' ? recalculatedClock : tcClocks.blue
        };
        const tcSyncSeq = gameState.move_history.length;
        await channel.send({
          type: 'broadcast',
          event: 'clock_sync',
          payload: {
            type: 'clock_sync',
            payload: { red: correctedClocks.red, blue: correctedClocks.blue },
            seq: tcSyncSeq
          }
        });

        return jsonResponse({ data: { clock_correction: true, clocks: correctedClocks } });
      }
    }

    // === RESIGN HANDLING (Story 3.7: AC #1, #11) ===
    if (isResign) {
      if (gameState.phase !== 'playing') {
        return errorResponse('Can only resign during playing phase', 'PHASE_MISMATCH', 400);
      }

      const resignOpponentColor: 'red' | 'blue' = playerColor === 'red' ? 'blue' : 'red';
      const resignSeq = gameState.move_history.length + 1;
      const resignResult = await completeGame(
        supabase as never,
        game_id,
        { status: 'resign', winner: resignOpponentColor, result_reason: null },
        resignSeq
      );

      if (!resignResult.success) {
        return errorResponse('Failed to complete game', 'INTERNAL_ERROR', 500);
      }

      return jsonResponse({ data: { status: 'resign', winner: resignOpponentColor } });
    }

    // === DRAW OFFER HANDLING (Story 3.7: AC #2, #10, #11) ===
    if (isDrawOffer) {
      if (gameState.phase !== 'playing') {
        return errorResponse('Can only offer draw during playing phase', 'PHASE_MISMATCH', 400);
      }

      let pendingAction = gameState.pending_action;
      if (pendingAction && isPendingActionExpired(pendingAction)) {
        const expireResult = await expirePendingAction(pendingAction);
        if (!expireResult.success) {
          return errorResponse('Failed to expire pending action', 'INTERNAL_ERROR', 500);
        }
        pendingAction = null;
      }
      if (pendingAction && pendingAction.color === playerColor) {
        return errorResponse('You already have a pending offer', 'DUPLICATE_ACTION', 400);
      }

      const drawOfferPending: PendingAction = {
        type: 'draw_offer',
        color: playerColor,
        created_at: new Date().toISOString()
      };

      const { error: drawOfferUpdateError } = await supabase
        .from('game_states')
        .update({ pending_action: drawOfferPending })
        .eq('id', gameState.id);

      if (drawOfferUpdateError) {
        return errorResponse('Failed to store draw offer', 'INTERNAL_ERROR', 500);
      }

      const drawOfferSeq = gameState.move_history.length;
      const drawOfferChannel = supabase.channel(`game:${game_id}`);
      await drawOfferChannel.send({
        type: 'broadcast',
        event: 'draw_offer',
        payload: {
          type: 'draw_offer',
          payload: { offering_color: playerColor },
          seq: drawOfferSeq
        }
      });

      return jsonResponse({ data: { draw_offer: true } });
    }

    // === DRAW ACCEPT HANDLING (Story 3.7: AC #3, #10, #11) ===
    if (isDrawAccept) {
      if (gameState.phase !== 'playing') {
        return errorResponse('Can only accept draw during playing phase', 'PHASE_MISMATCH', 400);
      }

      const drawAcceptPending = gameState.pending_action;
      if (drawAcceptPending && isPendingActionExpired(drawAcceptPending)) {
        const expireResult = await expirePendingAction(drawAcceptPending);
        if (!expireResult.success) {
          return errorResponse('Failed to expire pending action', 'INTERNAL_ERROR', 500);
        }
        return errorResponse('Draw offer has expired', 'EXPIRED_ACTION', 409);
      }
      if (
        !drawAcceptPending ||
        drawAcceptPending.type !== 'draw_offer' ||
        drawAcceptPending.color === playerColor
      ) {
        return errorResponse('No pending draw offer from opponent', 'INVALID_ACTION', 400);
      }

      // Clear pending action
      const { error: drawAcceptClearError } = await supabase
        .from('game_states')
        .update({ pending_action: null })
        .eq('id', gameState.id);

      if (drawAcceptClearError) {
        return errorResponse('Failed to clear draw offer', 'INTERNAL_ERROR', 500);
      }

      const drawAcceptSeq = gameState.move_history.length + 1;
      const drawAcceptResult = await completeGame(
        supabase as never,
        game_id,
        { status: 'draw', winner: null, result_reason: 'mutual_agreement' },
        drawAcceptSeq
      );

      if (!drawAcceptResult.success) {
        return errorResponse('Failed to complete game', 'INTERNAL_ERROR', 500);
      }

      return jsonResponse({
        data: { status: 'draw', winner: null, result_reason: 'mutual_agreement' }
      });
    }

    // === DRAW DECLINE HANDLING (Story 3.7: AC #4) ===
    if (isDrawDecline) {
      if (gameState.phase !== 'playing') {
        return errorResponse('Can only decline draw during playing phase', 'PHASE_MISMATCH', 400);
      }

      const drawDeclinePending = gameState.pending_action;
      if (drawDeclinePending && isPendingActionExpired(drawDeclinePending)) {
        const expireResult = await expirePendingAction(drawDeclinePending);
        if (!expireResult.success) {
          return errorResponse('Failed to expire pending action', 'INTERNAL_ERROR', 500);
        }
        return errorResponse('Draw offer has expired', 'EXPIRED_ACTION', 409);
      }
      if (
        !drawDeclinePending ||
        drawDeclinePending.type !== 'draw_offer' ||
        drawDeclinePending.color === playerColor
      ) {
        return errorResponse('No pending draw offer from opponent', 'INVALID_ACTION', 400);
      }

      const { error: drawDeclineClearError } = await supabase
        .from('game_states')
        .update({ pending_action: null })
        .eq('id', gameState.id);

      if (drawDeclineClearError) {
        return errorResponse('Failed to clear draw offer', 'INTERNAL_ERROR', 500);
      }

      const drawDeclineSeq = gameState.move_history.length;
      const drawDeclineChannel = supabase.channel(`game:${game_id}`);
      await drawDeclineChannel.send({
        type: 'broadcast',
        event: 'draw_declined',
        payload: {
          type: 'draw_declined',
          payload: {},
          seq: drawDeclineSeq
        }
      });

      return jsonResponse({ data: { draw_declined: true } });
    }

    // === TAKEBACK REQUEST HANDLING (Story 3.7: AC #6, #10, #11) ===
    if (isTakebackRequest) {
      if (gameState.phase !== 'playing') {
        return errorResponse(
          'Can only request takeback during playing phase',
          'PHASE_MISMATCH',
          400
        );
      }

      if (gameState.move_history.length === 0) {
        return errorResponse('No moves to take back', 'INVALID_ACTION', 400);
      }

      let takebackReqPending = gameState.pending_action;
      if (takebackReqPending && isPendingActionExpired(takebackReqPending)) {
        const expireResult = await expirePendingAction(takebackReqPending);
        if (!expireResult.success) {
          return errorResponse('Failed to expire pending action', 'INTERNAL_ERROR', 500);
        }
        takebackReqPending = null;
      }
      if (takebackReqPending && takebackReqPending.color === playerColor) {
        return errorResponse('You already have a pending request', 'DUPLICATE_ACTION', 400);
      }

      const takebackPending: PendingAction = {
        type: 'takeback_request',
        color: playerColor,
        move_count: gameState.move_history.length,
        created_at: new Date().toISOString()
      };

      const { error: takebackReqUpdateError } = await supabase
        .from('game_states')
        .update({ pending_action: takebackPending })
        .eq('id', gameState.id);

      if (takebackReqUpdateError) {
        return errorResponse('Failed to store takeback request', 'INTERNAL_ERROR', 500);
      }

      const takebackReqSeq = gameState.move_history.length;
      const takebackReqChannel = supabase.channel(`game:${game_id}`);
      await takebackReqChannel.send({
        type: 'broadcast',
        event: 'takeback_request',
        payload: {
          type: 'takeback_request',
          payload: { requesting_color: playerColor, move_count: gameState.move_history.length },
          seq: takebackReqSeq
        }
      });

      return jsonResponse({ data: { takeback_request: true } });
    }

    // === TAKEBACK ACCEPT HANDLING (Story 3.7: AC #7, #10) ===
    if (isTakebackAccept) {
      if (gameState.phase !== 'playing') {
        return errorResponse(
          'Can only accept takeback during playing phase',
          'PHASE_MISMATCH',
          400
        );
      }

      const takebackAcceptPending = gameState.pending_action;
      if (takebackAcceptPending && isPendingActionExpired(takebackAcceptPending)) {
        const expireResult = await expirePendingAction(takebackAcceptPending);
        if (!expireResult.success) {
          return errorResponse('Failed to expire pending action', 'INTERNAL_ERROR', 500);
        }
        return errorResponse('Takeback request has expired', 'EXPIRED_ACTION', 409);
      }
      if (
        !takebackAcceptPending ||
        takebackAcceptPending.type !== 'takeback_request' ||
        takebackAcceptPending.color === playerColor
      ) {
        return errorResponse('No pending takeback request from opponent', 'INVALID_ACTION', 400);
      }

      // Verify no moves have been made since the request
      if (gameState.move_history.length !== takebackAcceptPending.move_count) {
        return errorResponse(
          'Takeback request is stale — moves have been made since',
          'STALE_STATE',
          409
        );
      }

      // Undo last move: replay shortened history from DEFAULT_POSITION
      const shortenedHistory = gameState.move_history.slice(0, -1);
      const undoEngine = new CoTuLenh(DEFAULT_POSITION);
      for (const historySan of shortenedHistory) {
        const replayResult = undoEngine.move(historySan);
        if (!replayResult) {
          return errorResponse('Failed to replay move history for undo', 'INTERNAL_ERROR', 500);
        }
      }
      const undoFen = undoEngine.fen();

      // Atomically update game_states
      const undoNowIso = new Date().toISOString();
      const { error: undoUpdateError } = await supabase
        .from('game_states')
        .update({
          move_history: shortenedHistory,
          fen: undoFen,
          pending_action: null,
          updated_at: undoNowIso
        })
        .eq('id', gameState.id);

      if (undoUpdateError) {
        return errorResponse('Failed to undo move', 'INTERNAL_ERROR', 500);
      }

      const takebackAcceptSeq = gameState.move_history.length;
      const takebackAcceptChannel = supabase.channel(`game:${game_id}`);
      const currentClocks = gameState.clocks ?? { red: 0, blue: 0 };

      await takebackAcceptChannel.send({
        type: 'broadcast',
        event: 'takeback_accept',
        payload: {
          type: 'takeback_accept',
          payload: { fen: undoFen },
          seq: takebackAcceptSeq
        }
      });

      // Piggyback clock_sync to keep clients in sync
      await takebackAcceptChannel.send({
        type: 'broadcast',
        event: 'clock_sync',
        payload: {
          type: 'clock_sync',
          payload: { red: currentClocks.red, blue: currentClocks.blue },
          seq: takebackAcceptSeq
        }
      });

      return jsonResponse({ data: { takeback_accept: true, fen: undoFen } });
    }

    // === TAKEBACK DECLINE HANDLING (Story 3.7: AC #8) ===
    if (isTakebackDecline) {
      if (gameState.phase !== 'playing') {
        return errorResponse(
          'Can only decline takeback during playing phase',
          'PHASE_MISMATCH',
          400
        );
      }

      const takebackDeclinePending = gameState.pending_action;
      if (takebackDeclinePending && isPendingActionExpired(takebackDeclinePending)) {
        const expireResult = await expirePendingAction(takebackDeclinePending);
        if (!expireResult.success) {
          return errorResponse('Failed to expire pending action', 'INTERNAL_ERROR', 500);
        }
        return errorResponse('Takeback request has expired', 'EXPIRED_ACTION', 409);
      }
      if (
        !takebackDeclinePending ||
        takebackDeclinePending.type !== 'takeback_request' ||
        takebackDeclinePending.color === playerColor
      ) {
        return errorResponse('No pending takeback request from opponent', 'INVALID_ACTION', 400);
      }

      const { error: takebackDeclineClearError } = await supabase
        .from('game_states')
        .update({ pending_action: null })
        .eq('id', gameState.id);

      if (takebackDeclineClearError) {
        return errorResponse('Failed to clear takeback request', 'INTERNAL_ERROR', 500);
      }

      const takebackDeclineSeq = gameState.move_history.length;
      const takebackDeclineChannel = supabase.channel(`game:${game_id}`);
      await takebackDeclineChannel.send({
        type: 'broadcast',
        event: 'takeback_declined',
        payload: {
          type: 'takeback_declined',
          payload: {},
          seq: takebackDeclineSeq
        }
      });

      return jsonResponse({ data: { takeback_declined: true } });
    }

    // Phase-based routing
    if (gameState.phase === 'playing') {
      // === PLAYING PHASE: Single-move validation ===

      if (!isPlayingMove) {
        return errorResponse('Wrong phase', 'PHASE_MISMATCH', 400);
      }

      // Turn enforcement: verify caller's color matches current turn
      const engine = new CoTuLenh(DEFAULT_POSITION);
      for (const historySan of gameState.move_history) {
        const replayResult = engine.move(historySan);
        if (!replayResult) {
          return errorResponse('Corrupt move history', 'INTERNAL_ERROR', 500);
        }
      }

      const currentTurn = engine.turn(); // 'r' | 'b'
      if (currentTurn !== colorCode) {
        return errorResponse('Not your turn', 'WRONG_TURN', 403);
      }

      // Clock deduction: calculate elapsed time from updated_at delta
      const clocks = gameState.clocks ?? { red: 0, blue: 0 };
      const updatedAt = gameState.updated_at
        ? new Date(gameState.updated_at).getTime()
        : Date.now();
      const elapsed = Math.max(0, Date.now() - updatedAt);
      const incrementSeconds =
        (gameRow.time_control as { incrementSeconds?: number } | null)?.incrementSeconds ?? 0;

      // AC7: Check if moving player's clock expired BEFORE applying the move
      const clocksBeforeIncrement = applyElapsedAndIncrement({
        clocks,
        playerColor,
        elapsedMs: elapsed,
        incrementSeconds: 0 // No increment yet — check raw time
      });

      const movingPlayerClock =
        playerColor === 'red' ? clocksBeforeIncrement.red : clocksBeforeIncrement.blue;
      if (movingPlayerClock <= 0) {
        // Player ran out of time — move rejected, game over
        const timeoutOpponent: 'red' | 'blue' = playerColor === 'red' ? 'blue' : 'red';
        const timeoutSeq = gameState.move_history.length + 1;
        const timeoutResult = await completeGame(
          supabase as never,
          game_id,
          { status: 'timeout', winner: timeoutOpponent, result_reason: null },
          timeoutSeq
        );
        if (!timeoutResult.success) {
          return errorResponse('Failed to complete game', 'INTERNAL_ERROR', 500);
        }
        return errorResponse('time_expired', 'TIME_EXPIRED', 409);
      }

      // Validate proposed move against reconstructed state
      const moveResult = engine.move(san!);
      if (!moveResult) {
        return errorResponse('Illegal move', 'ILLEGAL_MOVE', 400);
      }

      const newFen = engine.fen();
      const newMoveHistory = [...gameState.move_history, san!];
      const nowIso = new Date().toISOString();

      // Apply with increment now that we know clock is valid
      const updatedClocks = applyElapsedAndIncrement({
        clocks,
        playerColor,
        elapsedMs: elapsed,
        incrementSeconds
      });

      // Persist: append move to history, update FEN, clocks, and clear pending action
      let moveUpdateQuery = supabase
        .from('game_states')
        .update({
          move_history: newMoveHistory,
          fen: newFen,
          clocks: updatedClocks,
          updated_at: nowIso,
          pending_action: null
        })
        .eq('id', gameState.id);

      moveUpdateQuery = gameState.updated_at
        ? moveUpdateQuery.eq('updated_at', gameState.updated_at)
        : moveUpdateQuery.is('updated_at', null);

      const { data: updatedRows, error: updateError } = await moveUpdateQuery.select('id').limit(1);

      if (updateError) {
        return errorResponse('Failed to update game state', 'INTERNAL_ERROR', 500);
      }
      if (!updatedRows || updatedRows.length === 0) {
        return errorResponse('Concurrent move detected', 'STALE_STATE', 409);
      }

      // Broadcast move event with seq = new move_history length
      const moveSeq = newMoveHistory.length;
      const channel = supabase.channel(`game:${game_id}`);

      await channel.send({
        type: 'broadcast',
        event: 'move',
        payload: {
          type: 'move',
          payload: { san: san!, fen: newFen },
          seq: moveSeq
        }
      });

      // Piggyback clock_sync event
      await channel.send({
        type: 'broadcast',
        event: 'clock_sync',
        payload: {
          type: 'clock_sync',
          payload: { red: updatedClocks.red, blue: updatedClocks.blue },
          seq: moveSeq
        }
      });

      // Story 3.7: Pending action expiry on move (AC #5, #9)
      if (gameState.pending_action) {
        const pending = gameState.pending_action;
        if (pending.type === 'draw_offer' && pending.color === playerColor) {
          // Draw offer expires when the offering player makes a move
          await channel.send({
            type: 'broadcast',
            event: 'draw_offer_expired',
            payload: {
              type: 'draw_offer_expired',
              payload: {},
              seq: moveSeq
            }
          });
        } else if (pending.type === 'takeback_request') {
          // Takeback request expires when any player makes a move
          await channel.send({
            type: 'broadcast',
            event: 'takeback_expired',
            payload: {
              type: 'takeback_expired',
              payload: {},
              seq: moveSeq
            }
          });
        }
      }

      // AC1-3: Game-end detection after successful move
      const gameEndResult = determineGameEndResult(engine, playerColor);
      if (gameEndResult) {
        const endSeq = moveSeq + 1;
        const endResult = await completeGame(supabase as never, game_id, gameEndResult, endSeq);
        if (!endResult.success) {
          return errorResponse('Failed to complete game', 'INTERNAL_ERROR', 500);
        }

        return jsonResponse({
          data: { san: san!, fen: newFen, seq: moveSeq, game_end: gameEndResult }
        });
      }

      return jsonResponse({
        data: { san: san!, fen: newFen, seq: moveSeq }
      });
    }

    // === DEPLOYING PHASE ===

    if (gameState.phase !== 'deploying') {
      return errorResponse('Wrong phase', 'PHASE_MISMATCH', 400);
    }

    // Playing moves not accepted during deploy phase
    if (isPlayingMove) {
      return errorResponse('Wrong phase', 'PHASE_MISMATCH', 400);
    }

    // Check if player already submitted deploy
    const deployState: DeployState = gameState.deploy_state ?? {};
    if (deployState[playerColor]) {
      return errorResponse('Deploy already submitted', 'ALREADY_SUBMITTED', 409);
    }

    // 1.6: Replay move_history from DEFAULT_POSITION, then validate submitted SAN array
    const engine = new CoTuLenh(DEFAULT_POSITION);

    // Replay existing move history to restore engine state
    for (const historySan of gameState.move_history) {
      const replayResult = engine.move(historySan);
      if (!replayResult) {
        return errorResponse('Corrupt move history', 'INTERNAL_ERROR', 500);
      }
    }

    // Validate submitted deploy SAN array against reconstructed engine state
    for (const deploySan of sans!) {
      const moveResult = engine.move(deploySan);
      if (!moveResult) {
        return errorResponse(`Invalid deploy move: ${deploySan}`, 'INVALID_MOVE', 400);
      }
    }

    // 1.7 & 1.8: Handle deploy submission
    const updatedDeployState: DeployState = { ...deployState, [playerColor]: sans };
    const bothSubmitted = !!updatedDeployState.red && !!updatedDeployState.blue;

    // Deploy flow has exactly two event hops: first submit and final commit.
    const seq = bothSubmitted ? 2 : 1;

    if (bothSubmitted) {
      // 1.8: Both players submitted — commit deploys, transition to playing

      // Replay opponent's deploy on top of current engine to get final FEN
      // We need a fresh engine to apply both deploys correctly
      const finalEngine = new CoTuLenh(DEFAULT_POSITION);

      // Replay existing move history
      for (const historySan of gameState.move_history) {
        finalEngine.move(historySan);
      }

      // Apply red deploy first, then blue
      const redSans = updatedDeployState.red!;
      const blueSans = updatedDeployState.blue!;

      for (const redSan of redSans) {
        const result = finalEngine.move(redSan);
        if (!result) {
          return errorResponse('Red deploy validation failed on commit', 'INTERNAL_ERROR', 500);
        }
      }

      for (const blueSan of blueSans) {
        const result = finalEngine.move(blueSan);
        if (!result) {
          return errorResponse('Blue deploy validation failed on commit', 'INTERNAL_ERROR', 500);
        }
      }

      const finalFen = finalEngine.fen();
      const fullMoveHistory = [...gameState.move_history, ...redSans, ...blueSans];

      // Update game_states: transition phase to 'playing', clear deploy_state
      let deployCommitUpdateQuery = supabase
        .from('game_states')
        .update({
          phase: 'playing',
          deploy_state: null,
          fen: finalFen,
          move_history: fullMoveHistory,
          updated_at: new Date().toISOString()
        })
        .eq('id', gameState.id);

      deployCommitUpdateQuery = gameState.updated_at
        ? deployCommitUpdateQuery.eq('updated_at', gameState.updated_at)
        : deployCommitUpdateQuery.is('updated_at', null);

      const { data: committedRows, error: updateError } = await deployCommitUpdateQuery
        .select('id')
        .limit(1);

      if (updateError) {
        return errorResponse('Failed to update game state', 'INTERNAL_ERROR', 500);
      }
      if (!committedRows || committedRows.length === 0) {
        return errorResponse('Concurrent deploy commit detected', 'STALE_STATE', 409);
      }

      // 1.8 & 1.9: Broadcast deploy_commit to both players with each other's deploy SANs
      const channel = supabase.channel(`game:${game_id}`);

      await channel.send({
        type: 'broadcast',
        event: 'deploy_commit',
        payload: {
          type: 'deploy_commit',
          payload: {
            sans: {
              red: redSans,
              blue: blueSans
            },
            fen: finalFen
          },
          seq
        }
      });

      return jsonResponse({
        success: true,
        phase: 'playing',
        fen: finalFen,
        both_submitted: true
      });
    } else {
      // 1.7: Single-player deploy success — store deploy in deploy_state, broadcast deploy_submitted

      let deployUpdateQuery = supabase
        .from('game_states')
        .update({
          deploy_state: updatedDeployState,
          updated_at: new Date().toISOString()
        })
        .eq('id', gameState.id);

      deployUpdateQuery = gameState.updated_at
        ? deployUpdateQuery.eq('updated_at', gameState.updated_at)
        : deployUpdateQuery.is('updated_at', null);

      const { data: submittedRows, error: updateError } = await deployUpdateQuery
        .select('id')
        .limit(1);

      if (updateError) {
        return errorResponse('Failed to update game state', 'INTERNAL_ERROR', 500);
      }
      if (!submittedRows || submittedRows.length === 0) {
        return errorResponse('Concurrent deploy submission detected', 'STALE_STATE', 409);
      }

      // 1.7 & 1.9: Broadcast deploy_submitted with color only (no placement reveal)
      const channel = supabase.channel(`game:${game_id}`);

      await channel.send({
        type: 'broadcast',
        event: 'deploy_submitted',
        payload: {
          type: 'deploy_submitted',
          payload: { color: colorCode },
          seq
        }
      });

      return jsonResponse({
        success: true,
        phase: 'deploying',
        both_submitted: false
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return errorResponse(message, 'INTERNAL_ERROR', 500);
  }
});
