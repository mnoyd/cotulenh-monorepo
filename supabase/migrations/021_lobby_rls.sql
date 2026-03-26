-- Migration: 021_lobby_rls
-- Adds RLS policies for open challenge lobby and makes invite_code nullable
-- Open challenges: to_user IS NULL AND invite_code IS NULL
-- Shareable links: to_user IS NULL AND invite_code IS NOT NULL

-- Allow invite_code to be NULL for open challenges (previously NOT NULL with default)
ALTER TABLE public.game_invitations ALTER COLUMN invite_code DROP NOT NULL;

-- RLS: All authenticated users can SELECT open challenges (lobby visibility)
CREATE POLICY "Authenticated users can view open challenges"
  ON public.game_invitations FOR SELECT
  TO authenticated
  USING (
    to_user IS NULL
    AND invite_code IS NULL
    AND status = 'pending'
    AND expires_at > now()
  );

-- RLS: Authenticated users can accept open challenges (claim by setting to_user)
-- Reuses similar pattern to "Users can claim link invitations" from migration 005
CREATE POLICY "Authenticated users can accept open challenges"
  ON public.game_invitations FOR UPDATE
  TO authenticated
  USING (
    to_user IS NULL
    AND invite_code IS NULL
    AND status = 'pending'
    AND from_user != auth.uid()
    AND expires_at > now()
  )
  WITH CHECK (
    to_user = auth.uid()
    AND from_user != auth.uid()
  );
