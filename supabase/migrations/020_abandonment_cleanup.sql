-- Migration: 020_abandonment_cleanup
-- Adds reconnect_attempted tracking to distinguish abandonment from disconnect forfeit.
-- Creates stale game cleanup RPC + cron job (24h threshold, runs every 6h).

-- 1.2: Add reconnect_attempted boolean to game_states
ALTER TABLE public.game_states
  ADD COLUMN reconnect_attempted boolean NOT NULL DEFAULT false;

-- Reset reconnect_attempted on new disconnect to avoid stale flag from previous cycle.
-- Per Design Decision #1: "Reset to false each time a new disconnect is recorded."
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
    reconnect_attempted = false,
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

REVOKE ALL ON FUNCTION public.record_player_disconnect(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_player_disconnect(uuid, text) TO service_role;

-- 1.3: Update clear_player_disconnect to set reconnect_attempted = true
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
    reconnect_attempted = true,
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

-- 1.4: Update forfeit_disconnected_games to check reconnect_attempted
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
  v_result_reason text;
BEGIN
  FOR r IN
    SELECT
      g.id AS game_id,
      gs.disconnect_red_at,
      gs.disconnect_blue_at,
      gs.reconnect_attempted
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
      v_result_reason := 'simultaneous_disconnect';
    ELSIF r.disconnect_blue_at IS NULL
       OR (r.disconnect_red_at IS NOT NULL AND r.disconnect_red_at <= r.disconnect_blue_at)
    THEN
      v_status := 'timeout';
      v_winner := 'blue';
      v_result_reason := CASE WHEN r.reconnect_attempted THEN 'disconnect_forfeit' ELSE 'abandonment' END;
    ELSE
      v_status := 'timeout';
      v_winner := 'red';
      v_result_reason := CASE WHEN r.reconnect_attempted THEN 'disconnect_forfeit' ELSE 'abandonment' END;
    END IF;

    UPDATE public.games
    SET
      status = v_status,
      winner = v_winner,
      result_reason = v_result_reason,
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

-- 1.5: Create cleanup_stale_games RPC
CREATE OR REPLACE FUNCTION public.cleanup_stale_games()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE public.games
  SET
    status = 'aborted',
    winner = NULL,
    result_reason = 'stale_cleanup',
    ended_at = now()
  WHERE status = 'started'
    AND COALESCE(
      (
        SELECT GREATEST(public.games.updated_at, gs.updated_at)
        FROM public.game_states gs
        WHERE gs.game_id = public.games.id
      ),
      public.games.updated_at
    ) < now() - interval '24 hours';

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- 1.6: Grant permissions on new/updated RPCs
REVOKE ALL ON FUNCTION public.cleanup_stale_games() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cleanup_stale_games() TO service_role;

-- Existing RPCs already have correct grants from 018, but re-apply for the updated versions
REVOKE ALL ON FUNCTION public.clear_player_disconnect(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.clear_player_disconnect(uuid, text) TO service_role;

REVOKE ALL ON FUNCTION public.forfeit_disconnected_games() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.forfeit_disconnected_games() TO service_role;

-- 1.7: Update lock_game_state_for_update to include reconnect_attempted
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
  clocks_paused boolean,
  reconnect_attempted boolean
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
    gs.clocks_paused,
    gs.reconnect_attempted
  FROM public.game_states gs
  WHERE gs.game_id = p_game_id
  FOR UPDATE;
END;
$$;

REVOKE ALL ON FUNCTION public.lock_game_state_for_update(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lock_game_state_for_update(uuid) TO service_role;

ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "game participants can receive realtime broadcast and presence"
  ON realtime.messages
  FOR SELECT
  TO authenticated
  USING (
    split_part(realtime.topic(), ':', 1) = 'game'
    AND realtime.messages.extension IN ('broadcast', 'presence')
    AND EXISTS (
      SELECT 1
      FROM public.games g
      WHERE g.id = split_part(realtime.topic(), ':', 2)::uuid
        AND auth.uid() IN (g.red_player, g.blue_player)
    )
  );

CREATE POLICY "game participants can send realtime broadcast and presence"
  ON realtime.messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    split_part(realtime.topic(), ':', 1) = 'game'
    AND realtime.messages.extension IN ('broadcast', 'presence')
    AND EXISTS (
      SELECT 1
      FROM public.games g
      WHERE g.id = split_part(realtime.topic(), ':', 2)::uuid
        AND auth.uid() IN (g.red_player, g.blue_player)
    )
  );

-- Task 2: Cron job for 24-hour stale game cleanup (every 6 hours)
SELECT cron.schedule(
  'cleanup-stale-games',
  '0 */6 * * *',
  $$ SELECT public.cleanup_stale_games(); $$
);
