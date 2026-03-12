# Sync `public.profiles` from `auth.users`

## What it does

- **On signup:** After insert into `auth.users`, a trigger upserts `public.profiles` with:
  - `email` ← `auth.users.email`
  - `user_metadata` ← `auth.users.raw_user_meta_data` (JSONB)
  - `avatar_url` ← first non-null of `avatar_url`, `picture`, `profile_photo`, `profilePicture` inside metadata
- **On update:** When email or `raw_user_meta_data` changes (e.g. `supabase.auth.updateUser({ data: {...} })`), the same fields are updated on `profiles`.
- **Backfill:** The script includes a one-time `INSERT ... ON CONFLICT DO UPDATE` from `auth.users` so existing users get filled in.

## How to run

1. Open **Supabase Dashboard** → **SQL Editor**.
2. Paste the full contents of `sync_profiles_from_auth.sql`.
3. Run once.

## If you already have `on_auth_user_created`

If a template trigger already inserts into `profiles` with only `id`, either:

- **Drop the old trigger first**, then run this script, or  
- Rename our triggers (e.g. `on_auth_user_created_sync_profiles_v2`) and drop the old one manually.

## If `INSERT` fails

Your `profiles` table may have other **NOT NULL** columns without defaults. Either add defaults for those columns or extend the `INSERT` in both functions and the backfill to include them.

## Verify

```sql
SELECT id, email, user_metadata, avatar_url, updated_at
FROM public.profiles
LIMIT 10;
```

New signups and any `updateUser` that changes metadata should keep `profiles` in sync automatically.
