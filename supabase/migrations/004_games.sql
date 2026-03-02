-- Migration: 004_games
-- Creates the games table for online matches and enables realtime on game_invitations

-- Games table — created when a match invitation is accepted
CREATE TABLE public.games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  red_player uuid NOT NULL REFERENCES public.profiles(id),
  blue_player uuid NOT NULL REFERENCES public.profiles(id),
  status text NOT NULL DEFAULT 'started'
    CHECK (status IN ('started', 'aborted', 'checkmate', 'resign', 'timeout', 'stalemate', 'draw', 'dispute')),
  winner text CHECK (winner IN ('red', 'blue') OR winner IS NULL),
  result_reason text,
  pgn text,
  time_control jsonb NOT NULL,
  invitation_id uuid REFERENCES public.game_invitations(id),
  started_at timestamptz DEFAULT now(),
  ended_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Both players can read their games
CREATE POLICY "Players can view own games"
  ON public.games FOR SELECT
  USING (auth.uid() = red_player OR auth.uid() = blue_player);

-- Only the invitation recipient can create a game, and only when a matching accepted invitation exists
CREATE POLICY "Players can create games"
  ON public.games FOR INSERT
  WITH CHECK (
    auth.uid() = blue_player
    AND invitation_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.game_invitations
      WHERE id = invitation_id
        AND status = 'accepted'
        AND to_user = auth.uid()
    )
  );

-- Either player can update game status (for game end conditions)
CREATE POLICY "Players can update own games"
  ON public.games FOR UPDATE
  USING (auth.uid() = red_player OR auth.uid() = blue_player);

-- Indexes
CREATE INDEX idx_games_red_player ON public.games (red_player);
CREATE INDEX idx_games_blue_player ON public.games (blue_player);
CREATE INDEX idx_games_status ON public.games (status);
CREATE INDEX idx_games_invitation_id ON public.games (invitation_id);

-- Trigger: auto-update updated_at on row modification
CREATE OR REPLACE FUNCTION public.update_games_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER games_updated_at
  BEFORE UPDATE ON public.games
  FOR EACH ROW EXECUTE FUNCTION public.update_games_updated_at();

-- Enable Postgres Changes realtime for game_invitations (needed for invitation notifications)
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_invitations;

-- Enable Postgres Changes realtime for games (needed for game state updates)
ALTER PUBLICATION supabase_realtime ADD TABLE public.games;
