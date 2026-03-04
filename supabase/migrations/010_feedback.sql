-- Migration: 010_feedback
-- Creates the feedback table for in-app user feedback submissions

CREATE TABLE public.feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id),
  message text NOT NULL CHECK (btrim(message) <> ''),
  page_url text NOT NULL,
  context_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Authenticated users can insert their own feedback
CREATE POLICY "Authenticated users can insert own feedback"
  ON public.feedback FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND user_id IS NOT NULL
  );

-- Anonymous users can insert feedback with null user_id
CREATE POLICY "Anonymous users can insert feedback"
  ON public.feedback FOR INSERT TO anon
  WITH CHECK (
    user_id IS NULL
  );

-- No SELECT/UPDATE/DELETE policies for regular users
-- Admin reads via Supabase dashboard with service_role bypass

-- Trigger: sanitize feedback message at write boundary
CREATE OR REPLACE FUNCTION public.sanitize_feedback_message()
RETURNS trigger AS $$
BEGIN
  NEW.message := btrim(regexp_replace(NEW.message, '<[^>]*>', '', 'g'));
  IF NEW.message = '' THEN
    RAISE EXCEPTION 'Feedback message must not be empty';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER feedback_sanitize_message
  BEFORE INSERT OR UPDATE ON public.feedback
  FOR EACH ROW EXECUTE FUNCTION public.sanitize_feedback_message();

-- Trigger: auto-update updated_at on row modification
CREATE OR REPLACE FUNCTION public.update_feedback_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER feedback_updated_at
  BEFORE UPDATE ON public.feedback
  FOR EACH ROW EXECUTE FUNCTION public.update_feedback_updated_at();
