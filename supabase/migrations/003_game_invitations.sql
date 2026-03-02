-- Migration: 003_game_invitations
-- Creates the game_invitations table with RLS, indexes, and auto-generated invite codes

-- Game invitations table
CREATE TABLE public.game_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  to_user uuid REFERENCES public.profiles(id) ON DELETE CASCADE, -- nullable for future invite links (Story 4.3)
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled', 'expired')),
  game_config jsonb NOT NULL, -- { timeMinutes: number, incrementSeconds: number }
  invite_code text NOT NULL UNIQUE DEFAULT substring(gen_random_uuid()::text, 1, 8),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '5 minutes')
);

-- Enable Row Level Security
ALTER TABLE public.game_invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- from_user or to_user can read
CREATE POLICY "Users can view own invitations"
  ON public.game_invitations FOR SELECT
  USING (auth.uid() = from_user OR auth.uid() = to_user);

-- Only from_user can create
CREATE POLICY "Users can create invitations"
  ON public.game_invitations FOR INSERT
  WITH CHECK (auth.uid() = from_user);

-- from_user or to_user can update (for accept/decline)
CREATE POLICY "Users can update own invitations"
  ON public.game_invitations FOR UPDATE
  USING (auth.uid() = from_user OR auth.uid() = to_user);

-- from_user can delete (cancel)
CREATE POLICY "Users can cancel own invitations"
  ON public.game_invitations FOR DELETE
  USING (auth.uid() = from_user);

-- Indexes
CREATE INDEX idx_game_invitations_from_user ON public.game_invitations (from_user);
CREATE INDEX idx_game_invitations_to_user ON public.game_invitations (to_user);
CREATE INDEX idx_game_invitations_status ON public.game_invitations (status);

-- Trigger: auto-update updated_at on row modification
CREATE OR REPLACE FUNCTION public.update_game_invitations_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER game_invitations_updated_at
  BEFORE UPDATE ON public.game_invitations
  FOR EACH ROW EXECUTE FUNCTION public.update_game_invitations_updated_at();
