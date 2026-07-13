-- =============================================================================
-- Migration: blocks, reports, and conversations.archived_at
-- Run once in the Supabase SQL Editor.
--
-- User FKs target public.profiles(id) (UUID), not auth.users.
-- Production conversations.player_id / coach_id are the same UUID as text;
-- compare with casts when joining (e.g. player_id = blocker_id::text).
-- =============================================================================

-- ---------- conversations.archived_at ----------
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ NULL;

-- ---------- blocks ----------
CREATE TABLE IF NOT EXISTS public.blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT blocks_no_self_block CHECK (blocker_id <> blocked_id),
  CONSTRAINT blocks_unique_pair UNIQUE (blocker_id, blocked_id)
);

CREATE INDEX IF NOT EXISTS idx_blocks_blocker_id ON public.blocks (blocker_id);
CREATE INDEX IF NOT EXISTS idx_blocks_blocked_id ON public.blocks (blocked_id);

ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "blocks_select_own" ON public.blocks;
DROP POLICY IF EXISTS "blocks_insert_own" ON public.blocks;
DROP POLICY IF EXISTS "blocks_delete_own" ON public.blocks;

CREATE POLICY "blocks_select_own"
  ON public.blocks
  FOR SELECT
  TO authenticated
  USING (blocker_id = auth.uid());

CREATE POLICY "blocks_insert_own"
  ON public.blocks
  FOR INSERT
  TO authenticated
  WITH CHECK (blocker_id = auth.uid());

CREATE POLICY "blocks_delete_own"
  ON public.blocks
  FOR DELETE
  TO authenticated
  USING (blocker_id = auth.uid());

-- ---------- reports ----------
CREATE TABLE IF NOT EXISTS public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  reported_user_id UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  conversation_id VARCHAR(255) NULL REFERENCES public.conversations(id) ON DELETE SET NULL,
  message_id VARCHAR(255) NULL REFERENCES public.messages(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  details TEXT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT reports_reason_check CHECK (
    reason IN (
      'harassment_bullying',
      'impersonation',
      'inappropriate_sexual_content',
      'hate_speech',
      'spam_scam',
      'threats_of_violence',
      'other'
    )
  ),
  CONSTRAINT reports_status_check CHECK (
    status IN ('open', 'reviewing', 'resolved')
  ),
  CONSTRAINT reports_no_self_report CHECK (
    reporter_id IS DISTINCT FROM reported_user_id
  )
);

CREATE INDEX IF NOT EXISTS idx_reports_reported_user_id ON public.reports (reported_user_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON public.reports (status);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reports_select_own" ON public.reports;
DROP POLICY IF EXISTS "reports_insert_own" ON public.reports;

CREATE POLICY "reports_select_own"
  ON public.reports
  FOR SELECT
  TO authenticated
  USING (reporter_id = auth.uid());

CREATE POLICY "reports_insert_own"
  ON public.reports
  FOR INSERT
  TO authenticated
  WITH CHECK (reporter_id = auth.uid());

-- No UPDATE/DELETE policies for authenticated: only service_role can change status.
