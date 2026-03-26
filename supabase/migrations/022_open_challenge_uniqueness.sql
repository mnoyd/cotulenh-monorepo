-- Migration: 022_open_challenge_uniqueness
-- Enforces at most one pending open challenge per player.

-- Expire stale pending open challenges before enforcing uniqueness.
UPDATE public.game_invitations
SET status = 'expired'
WHERE to_user IS NULL
  AND invite_code IS NULL
  AND status = 'pending'
  AND expires_at <= now();

-- If duplicates already exist, keep the newest pending open challenge and cancel the rest.
WITH ranked_open_challenges AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY from_user
      ORDER BY created_at DESC, id DESC
    ) AS row_num
  FROM public.game_invitations
  WHERE to_user IS NULL
    AND invite_code IS NULL
    AND status = 'pending'
)
UPDATE public.game_invitations AS invitations
SET status = 'cancelled'
FROM ranked_open_challenges
WHERE invitations.id = ranked_open_challenges.id
  AND ranked_open_challenges.row_num > 1;

CREATE UNIQUE INDEX idx_unique_pending_open_challenge
  ON public.game_invitations (from_user)
  WHERE to_user IS NULL
    AND invite_code IS NULL
    AND status = 'pending';
