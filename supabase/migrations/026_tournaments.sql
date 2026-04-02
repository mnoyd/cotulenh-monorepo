-- Migration: 026_tournaments
-- Create tournaments and tournament_participants tables for arena tournament system
-- Supports tournament lobby, registration, and real-time participant counts

-- Table: tournaments
CREATE TABLE public.tournaments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  time_control text NOT NULL,
  start_time timestamptz NOT NULL,
  duration_minutes integer NOT NULL,
  status text NOT NULL DEFAULT 'upcoming',
  participant_count integer NOT NULL DEFAULT 0,
  standings jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Constraint: status must be one of the allowed values
ALTER TABLE public.tournaments
  ADD CONSTRAINT tournaments_status_check
  CHECK (status IN ('upcoming', 'active', 'completed'));

-- Index for listing tournaments by status and start time
CREATE INDEX idx_tournaments_status_start ON public.tournaments(status, start_time);

-- RLS: anyone authenticated can read, only service_role writes
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read tournaments" ON public.tournaments FOR SELECT TO authenticated USING (true);

-- Table: tournament_participants (join table)
CREATE TABLE public.tournament_participants (
  tournament_id uuid NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at timestamptz DEFAULT now(),
  PRIMARY KEY (tournament_id, user_id)
);

CREATE INDEX idx_tournament_participants_user ON public.tournament_participants(user_id);

-- RLS: anyone authenticated can read; users can insert/delete own rows for upcoming tournaments only
ALTER TABLE public.tournament_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read tournament participants"
  ON public.tournament_participants FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can join upcoming tournaments"
  ON public.tournament_participants FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.tournaments
      WHERE id = tournament_id AND status = 'upcoming'
    )
  );

CREATE POLICY "Users can leave upcoming tournaments"
  ON public.tournament_participants FOR DELETE
  USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.tournaments
      WHERE id = tournament_id AND status = 'upcoming'
    )
  );

-- Trigger: auto-update updated_at on tournaments modification
CREATE OR REPLACE FUNCTION public.update_tournaments_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tournaments_updated_at
  BEFORE UPDATE ON public.tournaments
  FOR EACH ROW EXECUTE FUNCTION public.update_tournaments_updated_at();

-- Trigger: sync participant_count on tournament_participants insert/delete
CREATE OR REPLACE FUNCTION public.sync_tournament_participant_count()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.tournaments
    SET participant_count = participant_count + 1
    WHERE id = NEW.tournament_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.tournaments
    SET participant_count = participant_count - 1
    WHERE id = OLD.tournament_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

CREATE TRIGGER tournament_participants_count_sync
  AFTER INSERT OR DELETE ON public.tournament_participants
  FOR EACH ROW EXECUTE FUNCTION public.sync_tournament_participant_count();

-- Enable Realtime for tournaments table (participant_count updates broadcast to clients)
ALTER PUBLICATION supabase_realtime ADD TABLE public.tournaments;
