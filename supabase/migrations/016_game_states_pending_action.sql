-- Migration: 016_game_states_pending_action
-- Adds pending_action JSONB column to game_states for tracking draw offers and takeback requests
-- Used by validate-move Edge Function for resign/draw/takeback action handling (Story 3.7)

ALTER TABLE public.game_states
  ADD COLUMN pending_action jsonb DEFAULT NULL;

-- Update lock_game_state_for_update RPC to return the new column
CREATE OR REPLACE FUNCTION public.lock_game_state_for_update(p_game_id uuid)
RETURNS TABLE (
  id uuid,
  move_history text[],
  fen text,
  deploy_state jsonb,
  phase text,
  clocks jsonb,
  updated_at timestamptz,
  pending_action jsonb
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
    gs.pending_action
  FROM public.game_states gs
  WHERE gs.game_id = p_game_id
  FOR UPDATE;
END;
$$;

REVOKE ALL ON FUNCTION public.lock_game_state_for_update(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lock_game_state_for_update(uuid) TO service_role;
