-- Migration: 011_game_states
-- Creates the game_states table for tracking live game state (board, clocks, phase)
-- Also creates the create_game_with_state RPC for atomic game + game_state creation

-- Game states table — one-to-one with games, holds mutable game data
CREATE TABLE public.game_states (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL UNIQUE REFERENCES public.games(id) ON DELETE CASCADE,
  move_history text[] NOT NULL DEFAULT '{}',
  fen text NOT NULL,
  deploy_state jsonb,
  phase text NOT NULL DEFAULT 'deploying'
    CHECK (phase IN ('deploying', 'playing')),
  clocks jsonb NOT NULL,
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.game_states ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Participants can read their game's state (join through games table)
CREATE POLICY "Participants can view game state"
  ON public.game_states FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.games
    WHERE games.id = game_states.game_id
    AND (games.red_player = auth.uid() OR games.blue_player = auth.uid())
  ));

-- Service role only for writes (no direct client writes)
-- No INSERT/UPDATE/DELETE policies for authenticated users

-- Indexes
CREATE INDEX idx_game_states_game_id ON public.game_states (game_id);

-- Trigger: auto-update updated_at on row modification
CREATE OR REPLACE FUNCTION public.update_game_states_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER game_states_updated_at
  BEFORE UPDATE ON public.game_states
  FOR EACH ROW EXECUTE FUNCTION public.update_game_states_updated_at();

-- Enable Postgres Changes realtime for game_states (needed for live game updates)
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_states;

-- RPC function for atomic game + game_state creation
-- Runs as SECURITY DEFINER to bypass RLS for trusted inserts
DROP FUNCTION IF EXISTS public.create_game_with_state(uuid, uuid, uuid, jsonb, boolean, text, jsonb);

CREATE OR REPLACE FUNCTION public.create_game_with_state(
  p_invitation_id uuid,
  p_fen text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_game_id uuid;
  v_invitation public.game_invitations%ROWTYPE;
  v_time_minutes integer;
  v_clock_ms integer;
  v_is_rated boolean;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required'
      USING ERRCODE = '42501';
  END IF;

  -- Lock invitation row to serialize concurrent game creation attempts
  SELECT *
  INTO v_invitation
  FROM public.game_invitations
  WHERE id = p_invitation_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invitation not found'
      USING ERRCODE = 'P0002';
  END IF;

  IF v_invitation.status <> 'accepted' THEN
    RAISE EXCEPTION 'Invitation is not accepted'
      USING ERRCODE = '22023';
  END IF;

  IF v_invitation.to_user <> auth.uid() THEN
    RAISE EXCEPTION 'Only invitation recipient can create game'
      USING ERRCODE = '42501';
  END IF;

  v_time_minutes := (v_invitation.game_config ->> 'timeMinutes')::integer;
  IF v_time_minutes IS NULL OR v_time_minutes <= 0 THEN
    RAISE EXCEPTION 'Invalid invitation time control'
      USING ERRCODE = '22023';
  END IF;

  v_clock_ms := v_time_minutes * 60 * 1000;
  v_is_rated := COALESCE((v_invitation.game_config ->> 'isRated')::boolean, false);

  -- Insert into games
  INSERT INTO public.games (
    red_player,
    blue_player,
    status,
    time_control,
    invitation_id,
    is_rated
  ) VALUES (
    v_invitation.from_user,
    v_invitation.to_user,
    'started',
    v_invitation.game_config,
    v_invitation.id,
    v_is_rated
  )
  RETURNING id INTO v_game_id;

  -- Insert into game_states
  INSERT INTO public.game_states (
    game_id,
    move_history,
    fen,
    deploy_state,
    phase,
    clocks
  ) VALUES (
    v_game_id,
    '{}',
    p_fen,
    NULL,
    'deploying',
    jsonb_build_object('red', v_clock_ms, 'blue', v_clock_ms)
  );

  RETURN v_game_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_game_with_state(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_game_with_state(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_game_with_state(uuid, text) TO service_role;
