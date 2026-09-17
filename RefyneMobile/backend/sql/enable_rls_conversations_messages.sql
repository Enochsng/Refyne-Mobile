-- Enable RLS on conversations and messages to clear Security Advisor errors.
-- Backend uses service_role and bypasses RLS.
-- Authenticated clients may SELECT conversations and messages only when they are a participant.

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "conversations_select_participant" ON public.conversations;
DROP POLICY IF EXISTS "conversations_update_participant" ON public.conversations;

CREATE POLICY "conversations_select_participant"
  ON public.conversations
  FOR SELECT
  TO authenticated
  USING (
    auth.uid()::text = player_id
    OR auth.uid()::text = coach_id
  );

CREATE POLICY "conversations_update_participant"
  ON public.conversations
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid()::text = player_id
    OR auth.uid()::text = coach_id
  )
  WITH CHECK (
    auth.uid()::text = player_id
    OR auth.uid()::text = coach_id
  );

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "messages_select_participant" ON public.messages;

CREATE POLICY "messages_select_participant"
  ON public.messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.conversations
      WHERE conversations.id = messages.conversation_id
        AND (
          auth.uid()::text = conversations.player_id
          OR auth.uid()::text = conversations.coach_id
        )
    )
  );

-- Realtime: include messages in supabase_realtime if it is not already there.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;
END $$;
