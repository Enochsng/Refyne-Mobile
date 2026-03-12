# Supabase Security Advisor – 3 Errors Explained & Fix

## What the errors mean

### 1. RLS Disabled in Public – `public.conversations`

**What it is:** Your `conversations` table lives in the `public` schema, which is exposed through Supabase’s **PostgREST API** (the auto-generated REST API). **Row Level Security (RLS)** is **off**, so anyone who can hit your project with the **anon key** can, in principle, read or modify **all rows** in that table (depending on grants). That’s a data exposure risk.

**Why it matters:** `conversations` holds player/coach IDs, names, `session_id`, last message text, etc. Without RLS, the table is wide open to the anon/authenticated roles if they use the Supabase client directly.

**Relation to blank videos:** This does **not** directly cause videos/photos to go blank. Blank media is usually from **local `file://` URIs** or **Storage bucket** access. Fixing RLS is still required for security.

---

### 2. RLS Disabled in Public – `public.messages`

**Same pattern:** `messages` is public via the API with no RLS, so chat content and **`video_uri`** could be readable/writable by anyone using the anon key if table grants allow it.

**Relation to blank videos:** Again, not the direct cause of disappearing media. It **is** a serious privacy issue (all messages exposed).

---

### 3. Sensitive Columns Exposed – `public.conversations`

**What it is:** The linter sees that `conversations` is exposed without RLS and contains **`session_id`** (and other fields it classifies as sensitive). So it flags “sensitive columns exposed” because there’s no row-level protection.

**Fix:** Enabling RLS (and adding policies) addresses both the “RLS disabled” and “sensitive columns exposed” findings for that table.

---

## How we fix it (without breaking your app)

- Your **backend** uses the **service role** key → **bypasses RLS**. All existing backend code keeps working.
- Your **mobile app** uses the **anon key** and only does **SELECT** on `conversations` (e.g. coach’s conversations, player’s conversation lookup). So we add **RLS policies** that allow:
  - **SELECT** only when `auth.uid()` matches `player_id` or `coach_id` (stored as text UUIDs).
- **`messages`** are only read/written by the **backend** in your codebase. So we can enable RLS on `messages` and **not** add anon policies → only the service role can access `messages` via PostgREST; anon cannot read/write messages directly. That clears the advisor and locks down chat content.

---

## What to do in Supabase

1. Open **Supabase Dashboard** → your project → **SQL Editor**.
2. Run the script below **once** (you can paste the whole block).
3. Go back to **Security Advisor** → **Rerun linter**. The 3 errors should clear (or reduce to warnings if other tables remain).

### SQL script – run in Supabase SQL Editor

```sql
-- =============================================================================
-- RLS for public.conversations and public.messages
-- Run in Supabase SQL Editor. Backend (service role) bypasses RLS.
-- App uses anon key only to SELECT conversations where user is player or coach.
-- =============================================================================

-- ---------- CONVERSATIONS ----------
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- Drop policies if re-running script
DROP POLICY IF EXISTS "conversations_select_participant" ON public.conversations;
DROP POLICY IF EXISTS "conversations_update_participant" ON public.conversations;

-- Authenticated users can only read rows where they are the player or coach
CREATE POLICY "conversations_select_participant"
  ON public.conversations
  FOR SELECT
  TO authenticated
  USING (
    auth.uid()::text = player_id
    OR auth.uid()::text = coach_id
  );

-- Optional: allow participants to update their own conversation row (unread counts, etc.)
-- Only enable if your client actually updates conversations; otherwise omit.
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

-- ---------- MESSAGES ----------
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- No anon/authenticated policies: only service_role can access via API.
-- Backend uses service key → unchanged behavior.
-- If you later need client-side message reads, add a policy using EXISTS
-- against conversations where player_id/coach_id = auth.uid().

-- =============================================================================
-- If Security Advisor still flags coaching_sessions, repeat the same pattern:
-- ENABLE ROW LEVEL SECURITY + policies for player_id/coach_id as needed.
-- =============================================================================
```

### If `coaching_sessions` is also flagged later

Your app reads `coaching_sessions` from the client. If the advisor flags it, add similar policies using `coach_id` and any `player_id` column (check your actual column names in Table Editor).

---

## After running the script

1. **Test the app:** Coach home (recent activity) and player home should still load conversations.
2. **Test backend:** Send messages, upload video – should still work (service role).
3. **Security Advisor:** Rerun – errors for `conversations` / `messages` should be resolved.

## If something breaks

- **Empty lists for coach/player:** User might not be `authenticated` in Supabase (only `anon`). Ensure the app signs in with Supabase Auth so `auth.uid()` is set.
- **Backend errors:** Should not happen if the backend uses **service_role**. Confirm `.env` has `SUPABASE_SERVICE_KEY` and server uses it for `database.js`.

---

## Summary

| Error                         | Cause                          | Fix                                      |
|------------------------------|---------------------------------|------------------------------------------|
| RLS Disabled – conversations | Table public, no RLS            | `ENABLE ROW LEVEL SECURITY` + SELECT/UPDATE policies for participants |
| RLS Disabled – messages      | Same                            | `ENABLE ROW LEVEL SECURITY` only (backend-only access) |
| Sensitive columns exposed    | No RLS on conversations         | Same as first row – RLS limits who sees `session_id` etc. |

**Blank videos/photos** are still best fixed by **uploading to Supabase Storage** and storing **https URLs** in `video_uri` (and profile photos in metadata or Storage), not by RLS alone.
