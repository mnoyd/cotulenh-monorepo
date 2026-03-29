-- Migration: 024_profiles_usernames
-- Adds stable, unique usernames for public profile routing.

CREATE OR REPLACE FUNCTION public.normalize_profile_username(value text)
RETURNS text AS $$
DECLARE
  normalized text;
BEGIN
  normalized := lower(regexp_replace(COALESCE(value, ''), '[^a-zA-Z0-9]+', '-', 'g'));
  normalized := regexp_replace(normalized, '(^-+|-+$)', '', 'g');

  IF normalized = '' THEN
    normalized := 'player';
  END IF;

  RETURN normalized;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION public.generate_profile_username(base text, profile_id uuid)
RETURNS text AS $$
DECLARE
  base_slug text;
  suffix text;
  candidate text;
  attempt integer := 0;
BEGIN
  base_slug := public.normalize_profile_username(base);
  suffix := substring(replace(profile_id::text, '-', '') from 1 for 12);
  candidate := base_slug;

  LOOP
    EXIT WHEN NOT EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE username = candidate
        AND id <> profile_id
    );

    attempt := attempt + 1;
    candidate := base_slug || '-' || suffix;

    IF attempt > 1 THEN
      candidate := candidate || '-' || attempt::text;
    END IF;
  END LOOP;

  RETURN candidate;
END;
$$ LANGUAGE plpgsql STABLE;

ALTER TABLE public.profiles
ADD COLUMN username text;

UPDATE public.profiles
SET username = public.generate_profile_username(display_name, id)
WHERE username IS NULL;

ALTER TABLE public.profiles
ALTER COLUMN username SET NOT NULL;

ALTER TABLE public.profiles
ADD CONSTRAINT profiles_username_lowercase CHECK (username = lower(username));

CREATE UNIQUE INDEX idx_profiles_username ON public.profiles (username);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, username)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'display_name', 'Player'),
    public.generate_profile_username(
      COALESCE(
        new.raw_user_meta_data->>'username',
        new.raw_user_meta_data->>'display_name',
        'Player'
      ),
      new.id
    )
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
