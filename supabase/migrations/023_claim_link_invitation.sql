-- Migration: 023_claim_link_invitation
-- Adds a SECURITY DEFINER helper to atomically claim shareable invite links.

CREATE OR REPLACE FUNCTION public.claim_link_invitation(p_invite_code text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
BEGIN
  IF auth.uid() IS NULL OR p_invite_code IS NULL THEN
    RETURN NULL;
  END IF;

  UPDATE public.game_invitations
  SET to_user = auth.uid()
  WHERE invite_code = p_invite_code
    AND to_user IS NULL
    AND status = 'pending'
    AND from_user <> auth.uid()
    AND expires_at > now()
  RETURNING json_build_object(
    'id', id,
    'from_user', from_user,
    'game_config', game_config
  )
  INTO result;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_link_invitation(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_link_invitation(text) TO authenticated;
