-- Migration: 002_friendships
-- Creates the friendships table with RLS, indexes, and canonical ordering constraint

-- Friendships table
CREATE TABLE public.friendships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_b uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'blocked')),
  initiated_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  -- Canonical ordering: user_a < user_b prevents duplicate rows for same pair
  CONSTRAINT friendships_canonical_order CHECK (user_a < user_b),

  -- Each user pair can only have one friendship row
  CONSTRAINT friendships_unique_pair UNIQUE (user_a, user_b)
);

-- Enable Row Level Security
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

-- RLS Policies: users can only access rows where they are user_a or user_b
CREATE POLICY "Users can view own friendships"
  ON public.friendships FOR SELECT
  USING (auth.uid() = user_a OR auth.uid() = user_b);

CREATE POLICY "Users can insert friendships they initiate"
  ON public.friendships FOR INSERT
  WITH CHECK (auth.uid() = initiated_by AND (auth.uid() = user_a OR auth.uid() = user_b));

CREATE POLICY "Users can update own friendships"
  ON public.friendships FOR UPDATE
  USING (auth.uid() = user_a OR auth.uid() = user_b);

CREATE POLICY "Users can delete own friendships"
  ON public.friendships FOR DELETE
  USING (auth.uid() = user_a OR auth.uid() = user_b);

-- Indexes
CREATE INDEX idx_friendships_user_a ON public.friendships (user_a);
CREATE INDEX idx_friendships_user_b ON public.friendships (user_b);
CREATE INDEX idx_friendships_status ON public.friendships (status);
CREATE INDEX idx_friendships_initiated_by ON public.friendships (initiated_by);
