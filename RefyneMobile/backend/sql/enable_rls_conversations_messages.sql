-- Enable RLS on conversations and messages to clear Security Advisor errors.
-- Backend uses service_role and bypasses RLS. App uses authenticated SELECT on conversations only.

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
-- No policies for authenticated/anon: only service_role can access messages via API.
