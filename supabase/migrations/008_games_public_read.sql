-- Migration: 008_games_public_read
-- Allows public read access to completed games for game history and profiles (FR9)
-- The existing "Players can view own games" policy restricts SELECT to participants only,
-- which blocks viewing another user's game history on their public profile.

CREATE POLICY "Anyone can view completed games"
  ON public.games FOR SELECT
  USING (status NOT IN ('started'));
