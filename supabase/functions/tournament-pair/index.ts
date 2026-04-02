import { DEFAULT_POSITION } from '@cotulenh/core';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { generatePairings, type Participant } from './pairing.ts';

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

function parseJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = payload.padEnd(payload.length + ((4 - (payload.length % 4)) % 4), '=');
    return JSON.parse(atob(padded)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

type TournamentAction = 'start_tournament' | 'pair_next_round';

type Pairing = {
  game_id: string;
  red_player: string;
  blue_player: string;
};

async function handleStartTournament(
  supabase: ReturnType<typeof createClient>,
  tournamentId: string
): Promise<Response> {
  // Fetch tournament
  const { data: tournament, error: tError } = await supabase
    .from('tournaments')
    .select('*')
    .eq('id', tournamentId)
    .single();

  if (tError || !tournament) {
    return errorResponse('Tournament not found', 'NOT_FOUND', 404);
  }

  if (tournament.status !== 'upcoming') {
    return errorResponse('Tournament is not upcoming', 'INVALID_STATE', 400);
  }

  // Verify start time has arrived
  if (new Date(tournament.start_time) > new Date()) {
    return errorResponse('Tournament start time has not arrived', 'TOO_EARLY', 400);
  }

  // Transition to active
  const { error: updateErr } = await supabase
    .from('tournaments')
    .update({ status: 'active', current_round: 1 })
    .eq('id', tournamentId);

  if (updateErr) {
    return errorResponse('Failed to activate tournament', 'INTERNAL_ERROR', 500);
  }

  // Pair first round
  return await pairRound(supabase, tournamentId, tournament.time_control, 1);
}

async function handlePairNextRound(
  supabase: ReturnType<typeof createClient>,
  tournamentId: string
): Promise<Response> {
  const { data: tournament, error: tError } = await supabase
    .from('tournaments')
    .select('*')
    .eq('id', tournamentId)
    .single();

  if (tError || !tournament) {
    return errorResponse('Tournament not found', 'NOT_FOUND', 404);
  }

  if (tournament.status !== 'active') {
    return errorResponse('Tournament is not active', 'INVALID_STATE', 400);
  }

  // Check if tournament duration has expired
  const startTime = new Date(tournament.start_time).getTime();
  const durationMs = tournament.duration_minutes * 60 * 1000;
  if (Date.now() > startTime + durationMs) {
    // Tournament expired — complete it instead
    return await handleCompleteTournament(supabase, tournamentId);
  }

  const nextRound = (tournament.current_round ?? 0) + 1;

  // Update round number
  const { error: roundErr } = await supabase
    .from('tournaments')
    .update({ current_round: nextRound })
    .eq('id', tournamentId);

  if (roundErr) {
    return errorResponse('Failed to update round', 'INTERNAL_ERROR', 500);
  }

  return await pairRound(supabase, tournamentId, tournament.time_control, nextRound);
}

async function handleCompleteTournament(
  supabase: ReturnType<typeof createClient>,
  tournamentId: string
): Promise<Response> {
  const { error: rpcError } = await supabase.rpc('complete_tournament', {
    p_tournament_id: tournamentId
  });

  if (rpcError) {
    return errorResponse('Failed to complete tournament', 'INTERNAL_ERROR', 500);
  }

  // Fetch final standings for broadcast
  const { data: tournament } = await supabase
    .from('tournaments')
    .select('standings')
    .eq('id', tournamentId)
    .single();

  // Broadcast tournament_end
  const channel = supabase.channel(`tournament:${tournamentId}`);
  await channel.send({
    type: 'broadcast',
    event: 'tournament_end',
    payload: {
      type: 'tournament_end',
      payload: { standings: tournament?.standings ?? [] }
    }
  });

  return jsonResponse({ data: { status: 'completed', standings: tournament?.standings ?? [] } });
}

async function pairRound(
  supabase: ReturnType<typeof createClient>,
  tournamentId: string,
  timeControl: string,
  round: number
): Promise<Response> {
  // Guard against duplicate/manual re-pairing while round games are still running.
  const { count: activeGames, error: activeGamesErr } = await supabase
    .from('games')
    .select('id', { count: 'exact', head: true })
    .eq('tournament_id', tournamentId)
    .eq('status', 'started');

  if (activeGamesErr) {
    return errorResponse('Failed to validate round state', 'INTERNAL_ERROR', 500);
  }

  if ((activeGames ?? 0) > 0) {
    return errorResponse('Current round is still in progress', 'ROUND_IN_PROGRESS', 409);
  }

  // Fetch participants with scores
  const { data: participants, error: pError } = await supabase
    .from('tournament_participants')
    .select('user_id, score, games_played')
    .eq('tournament_id', tournamentId)
    .order('score', { ascending: false });

  if (pError || !participants) {
    return errorResponse('Failed to fetch participants', 'INTERNAL_ERROR', 500);
  }

  if (participants.length < 2) {
    // Not enough players — complete tournament
    return await handleCompleteTournament(supabase, tournamentId);
  }

  const { pairs, byePlayer } = generatePairings(participants as Participant[]);

  // Award bye
  if (byePlayer) {
    const { error: byeErr } = await supabase.rpc('award_tournament_bye', {
      p_tournament_id: tournamentId,
      p_user_id: byePlayer.user_id
    });
    if (byeErr) {
      return errorResponse('Failed to award bye', 'INTERNAL_ERROR', 500);
    }
  }

  // Parse time_control string (e.g., "3+2") into jsonb format
  const tcParts = timeControl.split('+');
  const timeMinutes = parseInt(tcParts[0], 10) || 5;
  const incrementSeconds = parseInt(tcParts[1], 10) || 0;
  const timeControlJson = { timeMinutes, incrementSeconds };

  // Create games for each pair
  const pairings: Pairing[] = [];
  for (const [red, blue] of pairs) {
    const { data: gameId, error: gameErr } = await supabase.rpc('create_tournament_game', {
      p_tournament_id: tournamentId,
      p_red_player: red.user_id,
      p_blue_player: blue.user_id,
      p_time_control: timeControlJson,
      p_fen: DEFAULT_POSITION
    });

    if (gameErr || !gameId) {
      console.error('Failed to create tournament game:', gameErr);
      continue;
    }

    pairings.push({
      game_id: gameId,
      red_player: red.user_id,
      blue_player: blue.user_id
    });
  }

  // Broadcast round_start event
  const channel = supabase.channel(`tournament:${tournamentId}`);
  await channel.send({
    type: 'broadcast',
    event: 'round_start',
    payload: {
      type: 'round_start',
      payload: {
        round,
        pairings,
        bye_player: byePlayer?.user_id ?? null
      }
    }
  });

  return jsonResponse({
    data: {
      round,
      pairings,
      bye_player: byePlayer?.user_id ?? null
    }
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 'METHOD_NOT_ALLOWED', 405);
  }

  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return errorResponse('Missing authorization', 'UNAUTHORIZED', 401);
    }
    const authToken = authHeader.slice('Bearer '.length);
    const jwtPayload = parseJwtPayload(authToken);
    const jwtRole = (jwtPayload?.role as string | undefined) ?? null;
    const isServiceRoleCall = jwtRole === 'service_role';

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    let callerUserId: string | null = null;
    if (!isServiceRoleCall) {
      // Verify end-user caller (internal service-role calls skip participant checks).
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
      callerUserId = user.id;
    }

    // Service role client for DB writes
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { tournament_id, action } = body as {
      tournament_id?: string;
      action?: TournamentAction;
    };

    if (!tournament_id || typeof tournament_id !== 'string') {
      return errorResponse('Missing tournament_id', 'INVALID_INPUT', 400);
    }

    if (!action || !['start_tournament', 'pair_next_round'].includes(action)) {
      return errorResponse('Invalid action', 'INVALID_INPUT', 400);
    }

    if (!isServiceRoleCall && callerUserId) {
      // Only tournament participants can trigger pairing actions.
      const { count: participantCount, error: participantErr } = await supabase
        .from('tournament_participants')
        .select('user_id', { count: 'exact', head: true })
        .eq('tournament_id', tournament_id)
        .eq('user_id', callerUserId);

      if (participantErr) {
        return errorResponse('Failed to verify permissions', 'INTERNAL_ERROR', 500);
      }

      if ((participantCount ?? 0) === 0) {
        return errorResponse('Not a tournament participant', 'FORBIDDEN', 403);
      }
    }

    switch (action) {
      case 'start_tournament':
        return await handleStartTournament(supabase, tournament_id);
      case 'pair_next_round':
        return await handlePairNextRound(supabase, tournament_id);
      default:
        return errorResponse('Unknown action', 'INVALID_INPUT', 400);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return errorResponse(message, 'INTERNAL_ERROR', 500);
  }
});
