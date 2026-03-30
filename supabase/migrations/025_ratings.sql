-- Migration: 025_ratings
-- Create ratings table for Glicko-2 rating system
-- Supports per-time-control ratings with provisional tracking

-- Table: ratings
CREATE TABLE public.ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  time_control text NOT NULL DEFAULT 'rapid',
  rating integer NOT NULL DEFAULT 1500,
  rating_deviation integer NOT NULL DEFAULT 350,
  volatility numeric(10,6) NOT NULL DEFAULT 0.060000,
  games_played integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Unique constraint: one rating per user per time control
CREATE UNIQUE INDEX idx_ratings_user_time_control ON public.ratings(user_id, time_control);
CREATE INDEX idx_ratings_user_id ON public.ratings(user_id);

-- RLS: anyone can read, only service role writes (bypasses RLS)
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read ratings" ON public.ratings FOR SELECT USING (true);

-- Trigger: auto-update updated_at on row modification
CREATE OR REPLACE FUNCTION public.update_ratings_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ratings_updated_at
  BEFORE UPDATE ON public.ratings
  FOR EACH ROW EXECUTE FUNCTION public.update_ratings_updated_at();

-- Add games_played cache to profiles for provisional indicator
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS rating_games_played integer NOT NULL DEFAULT 0;

-- Atomic RPC function: complete game and update ratings in a single transaction
-- If any statement fails, the entire transaction rolls back (NFR11)
CREATE OR REPLACE FUNCTION public.complete_game_with_ratings(
  p_game_id uuid,
  p_status text,
  p_winner text,
  p_result_reason text,
  p_is_rated boolean,
  p_red_player_id uuid,
  p_blue_player_id uuid,
  p_red_new_rating integer DEFAULT NULL,
  p_red_new_rd integer DEFAULT NULL,
  p_red_new_volatility numeric DEFAULT NULL,
  p_blue_new_rating integer DEFAULT NULL,
  p_blue_new_rd integer DEFAULT NULL,
  p_blue_new_volatility numeric DEFAULT NULL
) RETURNS void AS $$
BEGIN
  -- Update game status (always)
  UPDATE public.games SET
    status = p_status,
    winner = p_winner,
    result_reason = p_result_reason,
    ended_at = now()
  WHERE id = p_game_id;

  -- Update ratings only for rated games
  IF p_is_rated AND p_red_new_rating IS NOT NULL THEN
    -- Upsert red player rating
    INSERT INTO public.ratings (user_id, time_control, rating, rating_deviation, volatility, games_played)
    VALUES (p_red_player_id, 'rapid', p_red_new_rating, p_red_new_rd, p_red_new_volatility, 1)
    ON CONFLICT (user_id, time_control)
    DO UPDATE SET
      rating = p_red_new_rating,
      rating_deviation = p_red_new_rd,
      volatility = p_red_new_volatility,
      games_played = public.ratings.games_played + 1;

    -- Upsert blue player rating
    INSERT INTO public.ratings (user_id, time_control, rating, rating_deviation, volatility, games_played)
    VALUES (p_blue_player_id, 'rapid', p_blue_new_rating, p_blue_new_rd, p_blue_new_volatility, 1)
    ON CONFLICT (user_id, time_control)
    DO UPDATE SET
      rating = p_blue_new_rating,
      rating_deviation = p_blue_new_rd,
      volatility = p_blue_new_volatility,
      games_played = public.ratings.games_played + 1;

    -- Update profile rating cache (rating + games_played for provisional indicator)
    UPDATE public.profiles SET
      rating = p_red_new_rating,
      rating_games_played = (SELECT games_played FROM public.ratings WHERE user_id = p_red_player_id AND time_control = 'rapid')
    WHERE id = p_red_player_id;
    UPDATE public.profiles SET
      rating = p_blue_new_rating,
      rating_games_played = (SELECT games_played FROM public.ratings WHERE user_id = p_blue_player_id AND time_control = 'rapid')
    WHERE id = p_blue_player_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

REVOKE ALL ON FUNCTION public.complete_game_with_ratings(
  uuid,
  text,
  text,
  text,
  boolean,
  uuid,
  uuid,
  integer,
  integer,
  numeric,
  integer,
  integer,
  numeric
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.complete_game_with_ratings(
  uuid,
  text,
  text,
  text,
  boolean,
  uuid,
  uuid,
  integer,
  integer,
  numeric,
  integer,
  integer,
  numeric
) TO service_role;
