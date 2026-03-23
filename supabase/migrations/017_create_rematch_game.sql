-- Migration: 017_create_rematch_game
-- Creates the create_rematch_game RPC for atomic rematch game creation
-- Swaps colors from original game, copies time_control and is_rated, bypasses invitation flow

CREATE OR REPLACE FUNCTION public.create_rematch_game(
  p_original_game_id uuid,
  p_fen text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_game_id uuid;
  v_original public.games%ROWTYPE;
  v_time_minutes integer;
  v_clock_ms integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required'
      USING ERRCODE = '42501';
  END IF;

  -- Lock original game row to prevent concurrent rematch creation
  SELECT *
  INTO v_original
  FROM public.games
  WHERE id = p_original_game_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Original game not found'
      USING ERRCODE = 'P0002';
  END IF;

  -- Verify caller is a participant
  IF v_original.red_player <> auth.uid() AND v_original.blue_player <> auth.uid() THEN
    RAISE EXCEPTION 'Not a participant'
      USING ERRCODE = '42501';
  END IF;

  -- Verify game is terminal (not started, aborted, or dispute)
  IF v_original.status IN ('started', 'aborted', 'dispute') THEN
    RAISE EXCEPTION 'Game is not in a terminal state'
      USING ERRCODE = '22023';
  END IF;

  -- Extract time control
  v_time_minutes := (v_original.time_control ->> 'timeMinutes')::integer;
  IF v_time_minutes IS NULL OR v_time_minutes <= 0 THEN
    RAISE EXCEPTION 'Invalid time control in original game'
      USING ERRCODE = '22023';
  END IF;

  v_clock_ms := v_time_minutes * 60 * 1000;

  -- Insert new game with SWAPPED colors, no invitation_id
  INSERT INTO public.games (
    red_player,
    blue_player,
    status,
    time_control,
    invitation_id,
    is_rated
  ) VALUES (
    v_original.blue_player,  -- swap: original blue becomes new red
    v_original.red_player,   -- swap: original red becomes new blue
    'started',
    v_original.time_control,
    NULL,
    v_original.is_rated
  )
  RETURNING id INTO v_game_id;

  -- Insert new game_states
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

REVOKE ALL ON FUNCTION public.create_rematch_game(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_rematch_game(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_rematch_game(uuid, text) TO service_role;
