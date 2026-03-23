-- Migration: 019_disconnect_forfeit_cron
-- Schedules periodic disconnect-forfeit enforcement.

CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
  'forfeit-disconnected-games',
  '15 seconds',
  $$ SELECT public.forfeit_disconnected_games(); $$
);
