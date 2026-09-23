-- Enable RLS on coaching_sessions so authenticated clients only read
-- sessions they belong to (coach_id, or a conversations.session_id link as player).
-- Backend uses service_role and bypasses RLS.
--
-- Replica identity FULL is required so Realtime UPDATE filters on coach_id /
-- player_id still match (default identity is only the primary key).
-- conversations is included here because the app-wide listener will subscribe
-- to conversation INSERT/UPDATE; it already has participant RLS.

ALTER TABLE public.coaching_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "coaching_sessions_select_participant" ON public.coaching_sessions;

CREATE POLICY "coaching_sessions_select_participant"
  ON public.coaching_sessions
  FOR SELECT
  TO authenticated
  USING (
    auth.uid()::text = coach_id
    OR EXISTS (
      SELECT 1
      FROM public.conversations
      WHERE conversations.session_id = coaching_sessions.id
        AND auth.uid()::text = conversations.player_id
    )
  );

ALTER TABLE public.coaching_sessions REPLICA IDENTITY FULL;
ALTER TABLE public.conversations REPLICA IDENTITY FULL;

-- Realtime: include conversations and coaching_sessions if they are not already there.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'conversations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'coaching_sessions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.coaching_sessions;
  END IF;
END $$;

-- Undo (run these if you need to reverse this migration):
-- ALTER PUBLICATION supabase_realtime DROP TABLE public.coaching_sessions;
-- ALTER PUBLICATION supabase_realtime DROP TABLE public.conversations;
-- ALTER TABLE public.coaching_sessions REPLICA IDENTITY DEFAULT;
-- ALTER TABLE public.conversations REPLICA IDENTITY DEFAULT;
-- DROP POLICY IF EXISTS "coaching_sessions_select_participant" ON public.coaching_sessions;
-- ALTER TABLE public.coaching_sessions DISABLE ROW LEVEL SECURITY;
