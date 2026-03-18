import { CoTuLenh, DEFAULT_POSITION } from '@cotulenh/core';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { applyElapsedAndIncrement } from './clock.ts';
import { completeGame, determineGameEndResult } from './game-end.ts';

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
    const { game_id, sans, san, action, claiming_color } = body as {
      game_id?: string;
      sans?: string[];
      san?: string;
      action?: string;
      claiming_color?: 'red' | 'blue';
    };

    if (!game_id || typeof game_id !== 'string') {
      return errorResponse('Missing game_id', 'INVALID_INPUT', 400);
    }

    // Playing phase sends single `san`; deploy phase sends `sans` array
    const isPlayingMove = typeof san === 'string' && san.length > 0;
    const isTimeoutClaim = action === 'timeout_claim';

    if (!isPlayingMove && !isTimeoutClaim) {
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

    if (gameRow.status !== 'started') {
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
    } = stateRows[0];

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

      // Persist: append move to history, update FEN and clocks
      let moveUpdateQuery = supabase
        .from('game_states')
        .update({
          move_history: newMoveHistory,
          fen: newFen,
          clocks: updatedClocks,
          updated_at: nowIso
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
