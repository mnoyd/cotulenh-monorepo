-- Migration: 027_tournament_games
-- Extends tournament system for gameplay: pairing, scoring, standings, game linkage
-- Story 8.3: Arena Tournament Gameplay & Live Standings

-- 1. Add tournament_id to games table (nullable FK — non-tournament games remain NULL)
ALTER TABLE public.games ADD COLUMN tournament_id uuid REFERENCES public.tournaments(id) ON DELETE SET NULL;
CREATE INDEX idx_games_tournament ON public.games(tournament_id) WHERE tournament_id IS NOT NULL;

-- 2. Add scoring columns to tournament_participants
ALTER TABLE public.tournament_participants
  ADD COLUMN score numeric NOT NULL DEFAULT 0,
  ADD COLUMN games_played integer NOT NULL DEFAULT 0;

-- 3. Add current_round to tournaments
ALTER TABLE public.tournaments ADD COLUMN current_round integer NOT NULL DEFAULT 0;

-- 4. RPC: create_tournament_game — creates game + game_state atomically for tournament pairing
-- Called by tournament-pair Edge Function (service role only)
CREATE OR REPLACE FUNCTION public.create_tournament_game(
  p_tournament_id uuid,
  p_red_player uuid,
  p_blue_player uuid,
  p_time_control jsonb,
  p_fen text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_game_id uuid;
  v_time_minutes integer;
  v_clock_ms integer;
BEGIN
  v_time_minutes := (p_time_control ->> 'timeMinutes')::integer;
  IF v_time_minutes IS NULL OR v_time_minutes <= 0 THEN
    RAISE EXCEPTION 'Invalid time control'
      USING ERRCODE = '22023';
  END IF;

  v_clock_ms := v_time_minutes * 60 * 1000;

  -- Create game row (tournament games are unrated, no invitation)
  INSERT INTO public.games (
    red_player,
    blue_player,
    status,
    time_control,
    invitation_id,
    is_rated,
    tournament_id
  ) VALUES (
    p_red_player,
    p_blue_player,
    'started',
    p_time_control,
    NULL,
    false,
    p_tournament_id
  )
  RETURNING id INTO v_game_id;

  -- Create game_state row
  INSERT INTO public.game_states (
    game_id,
    move_history,
    fen,
    deploy_state,
    phase,
    clocks
  ) VALUES (
    v_game_id,
    '{}',
    p_fen,
    NULL,
    'deploying',
    jsonb_build_object('red', v_clock_ms, 'blue', v_clock_ms)
  );

  RETURN v_game_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_tournament_game(uuid, uuid, uuid, jsonb, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_tournament_game(uuid, uuid, uuid, jsonb, text) TO service_role;

-- 5. RPC: update_tournament_standings — updates scores and standings after a game completes
-- Returns remaining active games in the current round
CREATE OR REPLACE FUNCTION public.update_tournament_standings(
  p_tournament_id uuid,
  p_game_id uuid
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_game public.games%ROWTYPE;
  v_winner_score numeric;
  v_loser_score numeric;
  v_remaining integer;
  v_standings jsonb;
BEGIN
  -- Fetch the completed game
  SELECT * INTO v_game FROM public.games WHERE id = p_game_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Game not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_game.tournament_id <> p_tournament_id THEN
    RAISE EXCEPTION 'Game does not belong to tournament' USING ERRCODE = '22023';
  END IF;

  -- Determine score deltas
  IF v_game.winner IS NOT NULL THEN
    -- Win: winner gets 1 point
    IF v_game.winner = 'red' THEN
      UPDATE public.tournament_participants SET score = score + 1, games_played = games_played + 1
        WHERE tournament_id = p_tournament_id AND user_id = v_game.red_player;
      UPDATE public.tournament_participants SET games_played = games_played + 1
        WHERE tournament_id = p_tournament_id AND user_id = v_game.blue_player;
    ELSE
      UPDATE public.tournament_participants SET score = score + 1, games_played = games_played + 1
        WHERE tournament_id = p_tournament_id AND user_id = v_game.blue_player;
      UPDATE public.tournament_participants SET games_played = games_played + 1
        WHERE tournament_id = p_tournament_id AND user_id = v_game.red_player;
    END IF;
  ELSE
    -- Draw: each player gets 0.5 points
    UPDATE public.tournament_participants SET score = score + 0.5, games_played = games_played + 1
      WHERE tournament_id = p_tournament_id AND user_id IN (v_game.red_player, v_game.blue_player);
  END IF;

  -- Recompute standings jsonb
  SELECT jsonb_agg(
    jsonb_build_object(
      'player_id', tp.user_id,
      'player_name', COALESCE(p.display_name, 'Unknown'),
      'score', tp.score,
      'games_played', tp.games_played
    ) ORDER BY tp.score DESC, tp.games_played ASC
  )
  INTO v_standings
  FROM public.tournament_participants tp
  JOIN public.profiles p ON p.id = tp.user_id
  WHERE tp.tournament_id = p_tournament_id;

  -- Write standings to tournament
  UPDATE public.tournaments SET standings = COALESCE(v_standings, '[]'::jsonb)
    WHERE id = p_tournament_id;

  -- Count remaining active tournament games in this tournament
  SELECT COUNT(*)::integer INTO v_remaining
  FROM public.games
  WHERE tournament_id = p_tournament_id AND status = 'started';

  RETURN v_remaining;
END;
$$;

REVOKE ALL ON FUNCTION public.update_tournament_standings(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_tournament_standings(uuid, uuid) TO service_role;

-- 6. RPC: complete_tournament — finalizes tournament status and standings
CREATE OR REPLACE FUNCTION public.complete_tournament(
  p_tournament_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_standings jsonb;
BEGIN
  -- Final standings computation
  SELECT jsonb_agg(
    jsonb_build_object(
      'player_id', tp.user_id,
      'player_name', COALESCE(p.display_name, 'Unknown'),
      'score', tp.score,
      'games_played', tp.games_played
    ) ORDER BY tp.score DESC, tp.games_played ASC
  )
  INTO v_standings
  FROM public.tournament_participants tp
  JOIN public.profiles p ON p.id = tp.user_id
  WHERE tp.tournament_id = p_tournament_id;

  UPDATE public.tournaments SET
    status = 'completed',
    standings = COALESCE(v_standings, '[]'::jsonb)
  WHERE id = p_tournament_id;
END;
$$;

REVOKE ALL ON FUNCTION public.complete_tournament(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.complete_tournament(uuid) TO service_role;

-- 7. RPC: award_tournament_bye — gives bye points to a player skipping a round
CREATE OR REPLACE FUNCTION public.award_tournament_bye(
  p_tournament_id uuid,
  p_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.tournament_participants
  SET score = score + 1, games_played = games_played + 1
  WHERE tournament_id = p_tournament_id AND user_id = p_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.award_tournament_bye(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.award_tournament_bye(uuid, uuid) TO service_role;
