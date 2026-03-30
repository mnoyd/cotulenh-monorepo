-- Migration: 018_profiles_rating_and_friend_color
-- Adds an optional rating cache to profiles for social surfaces and
-- updates create_game_with_state to honor friend-challenge color choice.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS rating integer;

CREATE OR REPLACE FUNCTION public.create_game_with_state(
  p_invitation_id uuid,
  p_fen text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_game_id uuid;
  v_invitation public.game_invitations%ROWTYPE;
  v_time_minutes integer;
  v_clock_ms integer;
  v_is_rated boolean;
  v_preferred_color text;
  v_red_player uuid;
  v_blue_player uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required'
      USING ERRCODE = '42501';
  END IF;

  SELECT *
  INTO v_invitation
  FROM public.game_invitations
  WHERE id = p_invitation_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invitation not found'
      USING ERRCODE = 'P0002';
  END IF;

  IF v_invitation.status <> 'accepted' THEN
    RAISE EXCEPTION 'Invitation is not accepted'
      USING ERRCODE = '22023';
  END IF;

  IF v_invitation.to_user <> auth.uid() THEN
    RAISE EXCEPTION 'Only invitation recipient can create game'
      USING ERRCODE = '42501';
  END IF;

  v_time_minutes := (v_invitation.game_config ->> 'timeMinutes')::integer;
  IF v_time_minutes IS NULL OR v_time_minutes <= 0 THEN
    RAISE EXCEPTION 'Invalid invitation time control'
      USING ERRCODE = '22023';
  END IF;

  v_clock_ms := v_time_minutes * 60 * 1000;
  v_is_rated := COALESCE((v_invitation.game_config ->> 'isRated')::boolean, false);
  v_preferred_color := COALESCE(v_invitation.game_config ->> 'preferredColor', 'red');

  IF v_preferred_color = 'blue' THEN
    v_red_player := v_invitation.to_user;
    v_blue_player := v_invitation.from_user;
  ELSIF v_preferred_color = 'random' THEN
    IF random() < 0.5 THEN
      v_red_player := v_invitation.from_user;
      v_blue_player := v_invitation.to_user;
    ELSE
      v_red_player := v_invitation.to_user;
      v_blue_player := v_invitation.from_user;
    END IF;
  ELSE
    v_red_player := v_invitation.from_user;
    v_blue_player := v_invitation.to_user;
  END IF;

  INSERT INTO public.games (
    red_player,
    blue_player,
    status,
    time_control,
    invitation_id,
    is_rated
  ) VALUES (
    v_red_player,
    v_blue_player,
    'started',
    v_invitation.game_config,
    v_invitation.id,
    v_is_rated
  )
  RETURNING id INTO v_game_id;

  INSERT INTO public.game_states (
    game_id,
    move_history,
    fen,
    deploy_state,
    phase,
    clocks
  ) VALUES (
    v_game_id,
    '{}',
    p_fen,
    NULL,
    'deploying',
    jsonb_build_object('red', v_clock_ms, 'blue', v_clock_ms)
  );

  RETURN v_game_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_game_with_state(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_game_with_state(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_game_with_state(uuid, text) TO service_role;
