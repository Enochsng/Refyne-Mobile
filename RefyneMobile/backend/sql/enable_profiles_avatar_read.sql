-- Allow authenticated users to read profile rows for active coaches.
-- Needed so players can see coach avatar_url on Explore / coach cards.
-- Coach uploads write avatar_url via auth metadata sync (see sync_profiles_from_auth.sql).

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_read_coach_profile_avatars" ON public.profiles;

CREATE POLICY "authenticated_read_coach_profile_avatars"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.coach_profiles cp
      WHERE cp.id = profiles.id
        AND cp.deleted IS DISTINCT FROM true
    )
  );
