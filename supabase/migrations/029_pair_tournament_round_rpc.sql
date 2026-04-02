-- Migration: 029_pair_tournament_round_rpc
-- Restores the Story 8.3 SQL contract for round progression.
-- Requires migration 028 (invoke_tournament_pair_edge).

CREATE OR REPLACE FUNCTION public.pair_tournament_round(
  p_tournament_id uuid,
  p_action text DEFAULT 'pair_next_round'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request_id bigint;
BEGIN
  IF p_action NOT IN ('start_tournament', 'pair_next_round') THEN
    RAISE EXCEPTION 'Invalid action: %', p_action
      USING ERRCODE = '22023';
  END IF;

  v_request_id := public.invoke_tournament_pair_edge(p_tournament_id, p_action);

  RETURN jsonb_build_object(
    'tournament_id', p_tournament_id,
    'action', p_action,
    'request_id', v_request_id,
    'queued', v_request_id IS NOT NULL
  );
END;
$$;

REVOKE ALL ON FUNCTION public.pair_tournament_round(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.pair_tournament_round(uuid, text) TO service_role;
