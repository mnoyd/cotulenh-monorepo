-- Migration: 0180_game_states_disconnect_tracking
-- Adds disconnect tracking and clock pause metadata to game_states.
-- Also extends the lock_game_state_for_update RPC and adds helper RPCs for
-- disconnect recording, reconnect clearing, and timed disconnect forfeits.

ALTER TABLE public.game_states
  ADD COLUMN disconnect_red_at timestamptz DEFAULT NULL,
  ADD COLUMN disconnect_blue_at timestamptz DEFAULT NULL,
  ADD COLUMN clocks_paused boolean NOT NULL DEFAULT false;

DROP FUNCTION IF EXISTS public.lock_game_state_for_update(uuid);

CREATE OR REPLACE FUNCTION public.lock_game_state_for_update(p_game_id uuid)
RETURNS TABLE (
  id uuid,
  move_history text[],
  fen text,
  deploy_state jsonb,
  phase text,
  clocks jsonb,
  updated_at timestamptz,
  pending_action jsonb,
  disconnect_red_at timestamptz,
  disconnect_blue_at timestamptz,
  clocks_paused boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    gs.id,
    gs.move_history,
    gs.fen,
    gs.deploy_state,
    gs.phase,
    gs.clocks,
    gs.updated_at,
    gs.pending_action,
    gs.disconnect_red_at,
    gs.disconnect_blue_at,
    gs.clocks_paused
  FROM public.game_states gs
  WHERE gs.game_id = p_game_id
  FOR UPDATE;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_player_disconnect(
  p_game_id uuid,
  p_color text
)
RETURNS TABLE (
  disconnect_red_at timestamptz,
  disconnect_blue_at timestamptz,
  clocks_paused boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now timestamptz := now();
BEGIN
  IF p_color NOT IN ('red', 'blue') THEN
    RAISE EXCEPTION 'Invalid color'
      USING ERRCODE = '22023';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.games
    WHERE id = p_game_id
      AND status = 'started'
  ) THEN
    RAISE EXCEPTION 'Game not found or not started'
      USING ERRCODE = 'P0002';
  END IF;

  UPDATE public.game_states
  SET
    disconnect_red_at = CASE
      WHEN p_color = 'red' AND disconnect_red_at IS NULL THEN v_now
      ELSE disconnect_red_at
    END,
    disconnect_blue_at = CASE
      WHEN p_color = 'blue' AND disconnect_blue_at IS NULL THEN v_now
      ELSE disconnect_blue_at
    END,
    clocks_paused = true,
    updated_at = v_now
  WHERE game_id = p_game_id;

  RETURN QUERY
  SELECT
    gs.disconnect_red_at,
    gs.disconnect_blue_at,
    gs.clocks_paused
  FROM public.game_states gs
  WHERE gs.game_id = p_game_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.clear_player_disconnect(
  p_game_id uuid,
  p_color text
)
RETURNS TABLE (
  disconnect_red_at timestamptz,
  disconnect_blue_at timestamptz,
  clocks_paused boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now timestamptz := now();
BEGIN
  IF p_color NOT IN ('red', 'blue') THEN
    RAISE EXCEPTION 'Invalid color'
      USING ERRCODE = '22023';
  END IF;

  UPDATE public.game_states
  SET
    disconnect_red_at = CASE WHEN p_color = 'red' THEN NULL ELSE disconnect_red_at END,
    disconnect_blue_at = CASE WHEN p_color = 'blue' THEN NULL ELSE disconnect_blue_at END,
    clocks_paused = CASE
      WHEN p_color = 'red' THEN disconnect_blue_at IS NOT NULL
      ELSE disconnect_red_at IS NOT NULL
    END,
    updated_at = v_now
  WHERE game_id = p_game_id;

  RETURN QUERY
  SELECT
    gs.disconnect_red_at,
    gs.disconnect_blue_at,
    gs.clocks_paused
  FROM public.game_states gs
  WHERE gs.game_id = p_game_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.forfeit_disconnected_games()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now timestamptz := now();
  v_count integer := 0;
  r RECORD;
  v_winner text;
  v_status text;
BEGIN
  FOR r IN
    SELECT
      g.id AS game_id,
      gs.disconnect_red_at,
      gs.disconnect_blue_at
    FROM public.games g
    JOIN public.game_states gs ON gs.game_id = g.id
    WHERE g.status = 'started'
      AND (
        (gs.disconnect_red_at IS NOT NULL AND v_now - gs.disconnect_red_at >= interval '60 seconds')
        OR
        (gs.disconnect_blue_at IS NOT NULL AND v_now - gs.disconnect_blue_at >= interval '60 seconds')
      )
  LOOP
    IF r.disconnect_red_at IS NOT NULL
       AND r.disconnect_blue_at IS NOT NULL
       AND abs(extract(epoch from (r.disconnect_red_at - r.disconnect_blue_at))) <= 1
    THEN
      v_status := 'aborted';
      v_winner := NULL;
    ELSIF r.disconnect_blue_at IS NULL
       OR (r.disconnect_red_at IS NOT NULL AND r.disconnect_red_at <= r.disconnect_blue_at)
    THEN
      v_status := 'timeout';
      v_winner := 'blue';
    ELSE
      v_status := 'timeout';
      v_winner := 'red';
    END IF;

    UPDATE public.games
    SET
      status = v_status,
      winner = v_winner,
      result_reason = CASE WHEN v_status = 'timeout' THEN 'disconnect_forfeit' ELSE 'simultaneous_disconnect' END,
      ended_at = v_now
    WHERE id = r.game_id
      AND status = 'started';

    IF FOUND THEN
      UPDATE public.game_states
      SET
        clocks_paused = true,
        updated_at = v_now
      WHERE game_id = r.game_id;
      v_count := v_count + 1;
    END IF;
  END LOOP;

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.lock_game_state_for_update(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lock_game_state_for_update(uuid) TO service_role;

REVOKE ALL ON FUNCTION public.record_player_disconnect(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_player_disconnect(uuid, text) TO service_role;

REVOKE ALL ON FUNCTION public.clear_player_disconnect(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.clear_player_disconnect(uuid, text) TO service_role;

REVOKE ALL ON FUNCTION public.forfeit_disconnected_games() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.forfeit_disconnected_games() TO service_role;
