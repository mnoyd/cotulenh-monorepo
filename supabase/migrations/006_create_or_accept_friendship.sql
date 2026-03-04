-- Migration: 006_create_or_accept_friendship
-- Adds an RPC helper to guarantee invite-link auto-friend reconciliation under RLS.

CREATE OR REPLACE FUNCTION public.create_or_accept_friendship(
  p_user_1 uuid,
  p_user_2 uuid,
  p_initiated_by uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_a uuid;
  v_user_b uuid;
  v_status text;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_initiated_by THEN
    RETURN false;
  END IF;

  IF p_user_1 IS NULL OR p_user_2 IS NULL OR p_initiated_by IS NULL THEN
    RETURN false;
  END IF;

  IF p_user_1 = p_user_2 THEN
    RETURN false;
  END IF;

  IF p_initiated_by <> p_user_1 AND p_initiated_by <> p_user_2 THEN
    RETURN false;
  END IF;

  v_user_a := LEAST(p_user_1, p_user_2);
  v_user_b := GREATEST(p_user_1, p_user_2);

  INSERT INTO public.friendships (user_a, user_b, status, initiated_by)
  VALUES (v_user_a, v_user_b, 'accepted', p_initiated_by)
  ON CONFLICT (user_a, user_b)
  DO UPDATE
    SET status = 'accepted',
        updated_at = now()
    WHERE public.friendships.status <> 'blocked';

  SELECT status
    INTO v_status
  FROM public.friendships
  WHERE user_a = v_user_a
    AND user_b = v_user_b;

  RETURN v_status = 'accepted';
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_or_accept_friendship(uuid, uuid, uuid) TO authenticated;
