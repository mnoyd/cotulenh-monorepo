-- Migration: 013_games_unique_invitation_id
-- Prevent duplicate games for a single invitation under concurrent requests

CREATE UNIQUE INDEX idx_games_unique_invitation_id
  ON public.games (invitation_id)
  WHERE invitation_id IS NOT NULL;
