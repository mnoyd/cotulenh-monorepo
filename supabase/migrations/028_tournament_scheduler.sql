-- Migration: 028_tournament_scheduler
-- Adds cron-driven tournament activation and expiry completion for Story 8.3.

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS supabase_vault;

-- Internal helper: invoke tournament-pair Edge Function via HTTP.
CREATE OR REPLACE FUNCTION public.invoke_tournament_pair_edge(
  p_tournament_id uuid,
  p_action text
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project_url text;
  v_service_role_key text;
  v_request_id bigint;
BEGIN
  IF p_action NOT IN ('start_tournament', 'pair_next_round') THEN
    RAISE EXCEPTION 'Invalid action: %', p_action
      USING ERRCODE = '22023';
  END IF;

  SELECT decrypted_secret
  INTO v_project_url
  FROM vault.decrypted_secrets
  WHERE name IN ('project_url', 'supabase_project_url')
  ORDER BY CASE name WHEN 'project_url' THEN 0 ELSE 1 END
  LIMIT 1;

  SELECT decrypted_secret
  INTO v_service_role_key
  FROM vault.decrypted_secrets
  WHERE name IN ('service_role_key', 'supabase_service_role_key')
  ORDER BY CASE name WHEN 'service_role_key' THEN 0 ELSE 1 END
  LIMIT 1;

  IF v_project_url IS NULL OR v_service_role_key IS NULL THEN
    RAISE WARNING 'Tournament scheduler skipped: missing Vault secrets (project_url/service_role_key)';
    RETURN NULL;
  END IF;

  -- Normalize URL to avoid double slashes.
  IF right(v_project_url, 1) = '/' THEN
    v_project_url := left(v_project_url, length(v_project_url) - 1);
  END IF;

  SELECT net.http_post(
    url := v_project_url || '/functions/v1/tournament-pair',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_service_role_key
    ),
    body := jsonb_build_object(
      'tournament_id', p_tournament_id,
      'action', p_action
    )
  )
  INTO v_request_id;

  RETURN v_request_id;
END;
$$;

REVOKE ALL ON FUNCTION public.invoke_tournament_pair_edge(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.invoke_tournament_pair_edge(uuid, text) TO service_role;

-- Scheduler RPC #1: Start due upcoming tournaments.
CREATE OR REPLACE FUNCTION public.schedule_due_tournaments()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
  v_count integer := 0;
  v_request_id bigint;
BEGIN
  FOR r IN
    SELECT t.id
    FROM public.tournaments t
    WHERE t.status = 'upcoming'
      AND t.start_time <= now()
    ORDER BY t.start_time ASC
  LOOP
    v_request_id := public.invoke_tournament_pair_edge(r.id, 'start_tournament');
    IF v_request_id IS NOT NULL THEN
      v_count := v_count + 1;
    END IF;
  END LOOP;

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.schedule_due_tournaments() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.schedule_due_tournaments() TO service_role;

-- Scheduler RPC #2: Complete expired tournaments after active games finish.
CREATE OR REPLACE FUNCTION public.schedule_expired_tournaments()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
  v_count integer := 0;
  v_request_id bigint;
BEGIN
  FOR r IN
    SELECT t.id
    FROM public.tournaments t
    WHERE t.status = 'active'
      AND now() > t.start_time + make_interval(mins => t.duration_minutes)
      AND NOT EXISTS (
        SELECT 1
        FROM public.games g
        WHERE g.tournament_id = t.id
          AND g.status = 'started'
      )
  LOOP
    -- pair_next_round path auto-completes expired tournaments.
    v_request_id := public.invoke_tournament_pair_edge(r.id, 'pair_next_round');
    IF v_request_id IS NOT NULL THEN
      v_count := v_count + 1;
    END IF;
  END LOOP;

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.schedule_expired_tournaments() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.schedule_expired_tournaments() TO service_role;

-- Re-create jobs idempotently by unscheduling prior job IDs first.
DO $$
DECLARE
  v_job_id bigint;
BEGIN
  SELECT jobid INTO v_job_id FROM cron.job WHERE jobname = 'start-due-tournaments';
  IF v_job_id IS NOT NULL THEN
    PERFORM cron.unschedule(v_job_id);
  END IF;

  SELECT jobid INTO v_job_id FROM cron.job WHERE jobname = 'complete-expired-tournaments';
  IF v_job_id IS NOT NULL THEN
    PERFORM cron.unschedule(v_job_id);
  END IF;
END;
$$;

SELECT cron.schedule(
  'start-due-tournaments',
  '* * * * *',
  $$ SELECT public.schedule_due_tournaments(); $$
);

SELECT cron.schedule(
  'complete-expired-tournaments',
  '* * * * *',
  $$ SELECT public.schedule_expired_tournaments(); $$
);
