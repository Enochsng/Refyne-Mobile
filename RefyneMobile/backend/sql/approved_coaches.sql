-- =============================================================================
-- Invite-only coach signup: approved_coaches table and check function
-- Run in Supabase SQL Editor.
-- =============================================================================

-- Table of emails that are allowed to sign up as coaches
CREATE TABLE IF NOT EXISTS public.approved_coaches (
  email text NOT NULL PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT NOW()
);

-- Optional: enable RLS so only service role can modify; the check is done via the function below
ALTER TABLE public.approved_coaches ENABLE ROW LEVEL SECURITY;

-- Policy: no direct read/insert from anon or authenticated (keeps list private)
-- Use the is_approved_coach() function instead for signup checks
CREATE POLICY "Service role only for approved_coaches"
  ON public.approved_coaches
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Function: returns true if the given email is in approved_coaches (for use at signup)
-- Callable by anon so unauthenticated users can check before signing up as coach
CREATE OR REPLACE FUNCTION public.is_approved_coach(check_email text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.approved_coaches
    WHERE LOWER(TRIM(email)) = LOWER(TRIM(check_email))
  );
$$;

-- Allow anon and authenticated to call the function (needed for signup before user exists)
GRANT EXECUTE ON FUNCTION public.is_approved_coach(text) TO anon;
GRANT EXECUTE ON FUNCTION public.is_approved_coach(text) TO authenticated;

-- =============================================================================
-- To add an approved coach email (run in SQL Editor or use Supabase Table Editor):
--   INSERT INTO public.approved_coaches (email) VALUES ('coach@example.com');
-- =============================================================================
