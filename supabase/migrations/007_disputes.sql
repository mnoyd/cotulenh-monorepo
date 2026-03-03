-- Migration: 007_disputes
-- Creates the disputes table for recording move disputes during online games

-- Disputes table — created when an invalid move is detected during an online game
CREATE TABLE public.disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES public.games(id),
  reporting_user_id uuid NOT NULL REFERENCES public.profiles(id),
  move_san text NOT NULL,
  pgn_at_point text NOT NULL,
  classification text NOT NULL CHECK (classification IN ('bug', 'cheat')),
  comment text,
  resolution text,
  resolved_by uuid REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (game_id, reporting_user_id)
);

-- Enable Row Level Security
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Game participants can read disputes for their games
CREATE POLICY "Game participants can view disputes"
  ON public.disputes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.games
      WHERE id = game_id
      AND (auth.uid() = red_player OR auth.uid() = blue_player)
    )
  );

-- Game participants can insert disputes for their games
CREATE POLICY "Game participants can report disputes"
  ON public.disputes FOR INSERT
  WITH CHECK (
    auth.uid() = reporting_user_id
    AND EXISTS (
      SELECT 1 FROM public.games
      WHERE id = game_id
      AND (auth.uid() = red_player OR auth.uid() = blue_player)
    )
  );

-- No UPDATE policy for MVP — admin resolves via Supabase dashboard with service_role bypass

-- Indexes
CREATE INDEX idx_disputes_game_id ON public.disputes (game_id);

-- Trigger: auto-update updated_at on row modification
CREATE OR REPLACE FUNCTION public.update_disputes_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER disputes_updated_at
  BEFORE UPDATE ON public.disputes
  FOR EACH ROW EXECUTE FUNCTION public.update_disputes_updated_at();
