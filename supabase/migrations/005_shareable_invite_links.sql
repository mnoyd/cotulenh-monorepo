-- Migration: 005_shareable_invite_links
-- Adds RPC function, RLS policies, and partial index for shareable invite link lookups (Story 4.3)
-- Shareable links have to_user = NULL. Lookup is via SECURITY DEFINER function to prevent enumeration.

-- RPC function: look up a single invitation by invite code (SECURITY DEFINER prevents enumeration)
-- Returns joined invitation + inviter profile data, or NULL if not found/expired/claimed.
CREATE OR REPLACE FUNCTION get_invitation_by_code(p_invite_code text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'id', gi.id,
    'from_user', gi.from_user,
    'game_config', gi.game_config,
    'invite_code', gi.invite_code,
    'created_at', gi.created_at,
    'expires_at', gi.expires_at,
    'display_name', COALESCE(p.display_name, '')
  )
  INTO result
  FROM game_invitations gi
  LEFT JOIN profiles p ON p.id = gi.from_user
  WHERE gi.invite_code = p_invite_code
    AND gi.to_user IS NULL
    AND gi.status = 'pending'
    AND gi.expires_at > now();

  RETURN result;
END;
$$;

-- Grant execute to both authenticated and anonymous users (landing page is public)
GRANT EXECUTE ON FUNCTION get_invitation_by_code(text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_invitation_by_code(text) TO anon;

-- RLS: Allow authenticated users to claim unclaimed link invitations
-- (set to_user to self where to_user IS NULL, from_user != self, pending, not expired)
CREATE POLICY "Users can claim link invitations"
  ON public.game_invitations FOR UPDATE
  TO authenticated
  USING (
    to_user IS NULL
    AND status = 'pending'
    AND from_user != auth.uid()
    AND expires_at > now()
  )
  WITH CHECK (
    to_user = auth.uid()
  );

-- Partial index for fast invite code lookups on unclaimed link invitations
CREATE INDEX idx_game_invitations_invite_code
  ON public.game_invitations (invite_code)
  WHERE to_user IS NULL;
