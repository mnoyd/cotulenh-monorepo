-- Repair local Supabase drift for public.profiles after migrations 018 and 024.
-- This is intentionally local-only: it reconciles schema shape, username data,
-- the signup trigger, and migration bookkeeping for developer databases.

BEGIN;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS rating integer;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS username text;

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

WITH duplicate_usernames AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY username
      ORDER BY created_at NULLS FIRST, id
    ) AS row_num
  FROM public.profiles
  WHERE username IS NOT NULL
),
profiles_requiring_repair AS (
  SELECT p.id
  FROM public.profiles AS p
  LEFT JOIN duplicate_usernames AS du ON du.id = p.id
  WHERE p.username IS NULL
     OR p.username = ''
     OR p.username <> lower(p.username)
     OR COALESCE(du.row_num, 1) > 1
)
UPDATE public.profiles AS p
SET username = public.generate_profile_username(
  COALESCE(NULLIF(p.username, ''), p.display_name, 'Player'),
  p.id
)
FROM profiles_requiring_repair AS repair
WHERE repair.id = p.id;

ALTER TABLE public.profiles
  ALTER COLUMN username SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_username_lowercase'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_username_lowercase
      CHECK (username = lower(username));
  END IF;
END;
$$;

DROP INDEX IF EXISTS public.idx_profiles_username;
CREATE UNIQUE INDEX idx_profiles_username
  ON public.profiles (username);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, username)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', 'Player'),
    public.generate_profile_username(
      COALESCE(
        NEW.raw_user_meta_data->>'username',
        NEW.raw_user_meta_data->>'display_name',
        'Player'
      ),
      NEW.id
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'on_auth_user_created'
      AND tgrelid = 'auth.users'::regclass
      AND NOT tgisinternal
  ) THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
  END IF;
END;
$$;

INSERT INTO supabase_migrations.schema_migrations (version, name)
SELECT '024', 'profiles_usernames'
WHERE NOT EXISTS (
  SELECT 1
  FROM supabase_migrations.schema_migrations
  WHERE version = '024'
);

COMMIT;
