-- =============================================================================
-- Permanent account deletion (players and coaches)
-- Run once in Supabase SQL Editor.
--
-- Deletes all app data for a user inside a single transaction, then removes
-- auth.users so the email can be reused. Storage files are returned as paths
-- for best-effort cleanup by the backend after commit.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.delete_user_account(
  p_user_id uuid,
  p_user_type text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_uid text := p_user_id::text;
  v_meta jsonb;
  v_meta_type text;
  v_session_ids text[];
  v_chat_media_paths text[];
  v_avatar_url text;
  v_conv_ids text[];
BEGIN
  IF p_user_type NOT IN ('player', 'coach') THEN
    RAISE EXCEPTION 'Invalid user_type: %', p_user_type;
  END IF;

  SELECT raw_user_meta_data INTO v_meta
  FROM auth.users
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'USER_NOT_FOUND';
  END IF;

  v_meta_type := lower(COALESCE(
    v_meta->>'user_type',
    v_meta->>'role',
    'player'
  ));
  IF v_meta_type = 'coach' AND p_user_type <> 'coach' THEN
    RAISE EXCEPTION 'USER_TYPE_MISMATCH';
  ELSIF v_meta_type <> 'coach' AND p_user_type = 'coach' THEN
    RAISE EXCEPTION 'USER_TYPE_MISMATCH';
  END IF;

  SELECT avatar_url INTO v_avatar_url
  FROM public.profiles
  WHERE id = p_user_id;

  SELECT ARRAY_AGG(DISTINCT c.id) INTO v_conv_ids
  FROM public.conversations c
  WHERE (p_user_type = 'player' AND c.player_id = v_uid)
     OR (p_user_type = 'coach' AND c.coach_id = v_uid);

  IF v_conv_ids IS NOT NULL THEN
    SELECT ARRAY_AGG(DISTINCT m.video_uri) INTO v_chat_media_paths
    FROM public.messages m
    WHERE m.conversation_id = ANY(v_conv_ids)
      AND m.video_uri IS NOT NULL
      AND m.video_uri <> '';
  END IF;

  IF p_user_type = 'player' THEN
    SELECT ARRAY_AGG(DISTINCT session_id) INTO v_session_ids
    FROM public.conversations
    WHERE player_id = v_uid
      AND session_id IS NOT NULL;

    DELETE FROM public.conversations WHERE player_id = v_uid;

    IF v_session_ids IS NOT NULL THEN
      DELETE FROM public.coaching_sessions WHERE id = ANY(v_session_ids);
    END IF;
  ELSE
    DELETE FROM public.conversations WHERE coach_id = v_uid;
    DELETE FROM public.coaching_sessions WHERE coach_id = v_uid;
    DELETE FROM public.payment_transfers WHERE coach_id = v_uid;
    -- Local Stripe Connect reference only (no Stripe API unwind)
    DELETE FROM public.coach_connect_accounts WHERE coach_id = v_uid;
    DELETE FROM public.coach_profiles WHERE id = p_user_id;
  END IF;

  DELETE FROM public.profiles WHERE id = p_user_id;
  DELETE FROM auth.users WHERE id = p_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'userId', p_user_id,
    'userType', p_user_type,
    'storagePaths', jsonb_build_object(
      'avatars', CASE
        WHEN v_avatar_url IS NOT NULL AND v_avatar_url <> '' THEN jsonb_build_array(v_avatar_url)
        ELSE '[]'::jsonb
      END,
      'avatarPrefix', format('avatars/%s/', v_uid),
      'chatMedia', COALESCE(to_jsonb(v_chat_media_paths), '[]'::jsonb)
    )
  );
EXCEPTION
  WHEN OTHERS THEN
    RAISE;
END;
$$;

-- Grant execute to service role (backend uses service key)
GRANT EXECUTE ON FUNCTION public.delete_user_account(uuid, text) TO service_role;
