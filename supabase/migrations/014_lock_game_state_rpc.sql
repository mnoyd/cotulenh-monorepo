-- Migration: 014_lock_game_state_rpc
-- Creates RPC function for SELECT ... FOR UPDATE on game_states
-- Used by validate-move Edge Function for concurrency safety during deploy submissions

CREATE OR REPLACE FUNCTION public.lock_game_state_for_update(p_game_id uuid)
RETURNS TABLE (
  id uuid,
  move_history text[],
  fen text,
  deploy_state jsonb,
  phase text
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
    gs.phase
  FROM public.game_states gs
  WHERE gs.game_id = p_game_id
  FOR UPDATE;
END;
$$;

-- Only service_role can call this (Edge Functions use service role key)
REVOKE ALL ON FUNCTION public.lock_game_state_for_update(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lock_game_state_for_update(uuid) TO service_role;
