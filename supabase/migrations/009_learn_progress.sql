-- Migration: 009_learn_progress
-- Creates the learn_progress table for syncing learn progress across devices

-- Learn progress table with composite primary key for idempotent upserts
CREATE TABLE public.learn_progress (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id text NOT NULL,
  stars smallint NOT NULL DEFAULT 0 CHECK (stars >= 0 AND stars <= 3),
  move_count integer NOT NULL DEFAULT 0,
  completed_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, lesson_id)
);

-- Enable Row Level Security
ALTER TABLE public.learn_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies: owner-only read/write
CREATE POLICY "Users can read own learn progress"
  ON public.learn_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own learn progress"
  ON public.learn_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own learn progress"
  ON public.learn_progress FOR UPDATE
  USING (auth.uid() = user_id);

-- Index on user_id for efficient lookups
CREATE INDEX idx_learn_progress_user_id ON public.learn_progress (user_id);

-- Trigger function: auto-update updated_at on row update
CREATE OR REPLACE FUNCTION public.handle_learn_progress_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_learn_progress_updated
  BEFORE UPDATE ON public.learn_progress
  FOR EACH ROW EXECUTE FUNCTION public.handle_learn_progress_updated_at();
