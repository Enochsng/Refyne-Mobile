-- =============================================================================
-- Sync public.profiles from auth.users (Fix A)
-- Run in Supabase SQL Editor as a single script.
--
-- Ensures profiles get email, user_metadata (from raw_user_meta_data), and
-- avatar_url (from metadata keys used by OAuth / your app) on signup and
-- whenever auth user is updated.
--
-- Prerequisites:
--   - public.profiles exists with at least id (uuid, PK).
--   - Add columns if missing (see ALTER TABLE block below).
-- =============================================================================

-- ---------- 1) Ensure columns exist on public.profiles ----------
-- Safe to run repeatedly: only adds columns that are missing.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email text;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS user_metadata jsonb DEFAULT '{}'::jsonb;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_url text;

-- Optional but used by triggers below for sync bookkeeping
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT NOW();

-- ---------- 2) Function: sync row from auth.users to public.profiles ----------
-- Uses security definer so it can read auth.users and write public.profiles
-- regardless of RLS on profiles.

CREATE OR REPLACE FUNCTION public.sync_profile_from_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  meta jsonb;
  av text;
BEGIN
  meta := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);

  -- Common keys for avatar across providers / app metadata
  av := COALESCE(
    meta->>'avatar_url',
    meta->>'picture',
    meta->>'profile_photo',
    meta->>'profilePicture'
  );

  INSERT INTO public.profiles (id, email, user_metadata, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    meta,
    av
  )
  ON CONFLICT (id) DO UPDATE SET
    email       = EXCLUDED.email,
    user_metadata = EXCLUDED.user_metadata,
    avatar_url  = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url),
    updated_at  = NOW();

  RETURN NEW;
END;
$$;

-- ---------- 3) Trigger on INSERT (new signups) ----------
DROP TRIGGER IF EXISTS on_auth_user_created_sync_profiles ON auth.users;

CREATE TRIGGER on_auth_user_created_sync_profiles
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE PROCEDURE public.sync_profile_from_auth_user();

-- ---------- 4) Trigger on UPDATE (email / metadata / avatar changes) ----------
-- Fires when raw_user_meta_data or email changes so profiles stays in sync.

CREATE OR REPLACE FUNCTION public.sync_profile_from_auth_user_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  meta jsonb;
  av text;
BEGIN
  -- Only sync when something we care about changed
  IF (OLD.email IS NOT DISTINCT FROM NEW.email)
     AND (OLD.raw_user_meta_data IS NOT DISTINCT FROM NEW.raw_user_meta_data) THEN
    RETURN NEW;
  END IF;

  meta := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  av := COALESCE(
    meta->>'avatar_url',
    meta->>'picture',
    meta->>'profile_photo',
    meta->>'profilePicture'
  );

  UPDATE public.profiles
  SET
    email         = NEW.email,
    user_metadata = meta,
    avatar_url    = COALESCE(av, public.profiles.avatar_url),
    updated_at    = NOW()
  WHERE id = NEW.id;

  -- If profile row missing (e.g. created before trigger), insert it
  IF NOT FOUND THEN
    INSERT INTO public.profiles (id, email, user_metadata, avatar_url)
    VALUES (NEW.id, NEW.email, meta, av)
    ON CONFLICT (id) DO UPDATE SET
      email         = EXCLUDED.email,
      user_metadata = EXCLUDED.user_metadata,
      avatar_url    = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url),
      updated_at    = NOW();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_updated_sync_profiles ON auth.users;

CREATE TRIGGER on_auth_user_updated_sync_profiles
  AFTER UPDATE OF email, raw_user_meta_data ON auth.users
  FOR EACH ROW
  EXECUTE PROCEDURE public.sync_profile_from_auth_user_update();

-- ---------- 5) One-time backfill: existing profiles + missing rows ----------
-- Fills email, user_metadata, avatar_url for all auth users.
-- Run once after triggers are in place.

INSERT INTO public.profiles (id, email, user_metadata, avatar_url)
SELECT
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data, '{}'::jsonb),
  COALESCE(
    u.raw_user_meta_data->>'avatar_url',
    u.raw_user_meta_data->>'picture',
    u.raw_user_meta_data->>'profile_photo',
    u.raw_user_meta_data->>'profilePicture'
  )
FROM auth.users u
ON CONFLICT (id) DO UPDATE SET
  email         = EXCLUDED.email,
  user_metadata = EXCLUDED.user_metadata,
  avatar_url    = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url),
  updated_at    = NOW();

-- =============================================================================
-- Done. Verify:
--   SELECT id, email, user_metadata, avatar_url FROM public.profiles LIMIT 5;
--
-- If CREATE TRIGGER fails with "PROCEDURE" syntax error, use instead:
--   EXECUTE FUNCTION public.sync_profile_from_auth_user();
--   EXECUTE FUNCTION public.sync_profile_from_auth_user_update();
--
-- If you still have an old trigger (e.g. handle_new_user) that only inserts id,
-- drop it so you don't get duplicate or conflicting rows:
--   DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
--   -- then keep only on_auth_user_created_sync_profiles above
-- =============================================================================
