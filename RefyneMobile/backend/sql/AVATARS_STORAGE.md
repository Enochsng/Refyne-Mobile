# Profile avatars storage

## Bucket

- **Name:** `avatars` (created automatically on first upload if missing, or create manually in Dashboard → Storage).
- **Public:** Yes — URLs returned by `/api/upload/avatar` are public URLs.

## Path layout

- `avatars/{userId}/avatar.jpg` (or `.png` etc.) with **upsert** so each user has a single current avatar.

## RLS / policies

If you use a public bucket, objects are readable by URL. For upload, the backend uses the **service role** Supabase client, so no client-side Storage policy is required for uploads.

Optional: restrict public read to only the `avatars/` prefix via Storage policies if you prefer not to make the whole bucket public.

## If you see "The requested resource was not found"

That 404 is from the **production** server catch-all when **`POST /api/upload/avatar`** is not deployed yet. The app **falls back** to **`POST /api/upload/chat-media`** (same image upload) so avatars still get a permanent URL and `updateUser` + `profiles.avatar_url` work. After you deploy the backend with the avatar route, uploads will use the `avatars` bucket and stable path `avatars/{userId}/avatar.*`.

## Sync to `public.profiles`

After upload, the app calls `supabase.auth.updateUser({ data: { avatar_url } })`. Your trigger on `auth.users` (see `sync_profiles_from_auth.sql`) should copy that into `profiles.avatar_url`.
