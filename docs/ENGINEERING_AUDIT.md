# Refyne iOS MVP — engineering verification of the CoS readiness audit

**Date:** 2026-11-13  
**Scope:** Independent verification of the Chief of Staff static audit (canvas, 2026-11-11 ET) plus the runtime/install checks that audit could not run.  
**Baseline:** CoS review of commit `405a28f` (2026-10-06).  
**This HEAD:** `405a28f99cb968b2edb020fced06173a11a1b2f3` (identical).  
**Constraint:** Read-only except for this document. No application code was changed. Secret values, tokens, emails, and project identifiers are not repeated here.

The CoS canvas remains the project-status source of truth for journeys, founder decisions, and the ranked top-10. This document does not redo that work. It answers: *is HEAD still that commit, are the top-10 findings still true, what happens when you actually install and boot the tree, and what should the first Connect-auth patch look like?*

---

## 1. HEAD vs `405a28f`

| Fact | Result |
|------|--------|
| Local `HEAD` | `405a28f99cb968b2edb020fced06173a11a1b2f3` |
| `origin/main` after `git fetch origin main` | Same SHA |
| Commits since `405a28f` | **0** |
| Last commit date | 2026-10-06 22:23:02 -0400 |
| Last commit subject | Fix Home sport-shortcut back navigation, fail closed on chat video uploads, and bump the iOS build. |
| Application code drift vs the CoS audit | **None.** Every top-10 finding is evaluated against the same tree the canvas described. |

Recent history on `main` (newest first): live inbox (`08b0f7a`, 2026-09-22), chat rate-limit/auth cleanup, Expo SDK 57 prebuild, and a run of payment/Connect auth hardening through August–September 2026. The last *application* commit is still the CoS baseline.

GitHub at verification time:

- Open PRs: **0**
- Open issues: **0**
- Closed PRs: **1** — [#1](https://github.com/Enochsng/Refyne-Mobile/pull/1) “Require login and conversation membership on conversation API routes” (merged 2026-07-28, draft).
- Remote branches: `main`, leftover `cursor/conversation-route-auth-492a` (same SHA as the merged PR; stale).

---

## 2. Top-10 findings vs current HEAD

Verdicts: **Confirmed** (code and/or local runtime still match), **Refuted**, **Changed** (behavior differs from the canvas), **Can't tell from code**.

| Rank | Task (from CoS) | Verdict | Why |
|------|-----------------|---------|-----|
| 1 | Auth-gate remaining Connect routes | **Confirmed** | Seven Connect handlers still have no `requireAuthenticatedUser`. Local curls reached Stripe/validation/DB logic with **no 401**. |
| 2 | Confirm production Supabase RLS | **Can't tell from code** | Hardened SQL and the old `DISABLE RLS` / `GRANT ALL TO anon` scripts are both still in the repo. Live dashboard state was not queried (no credentials). |
| 3 | Unread as one source of truth | **Confirmed** | Integer unread columns, swallowed mark-read errors, coach `markedReadRef`, local-only open-thread zeroing, body `userType` on `POST /read`. |
| 4 | Resume correctness | **Confirmed** (one nuance) | AppState-any-`active` onboarding check, `expo-video` not paused on background, earnings still zeros on error. Home clip counters already keep last-good when a previous item exists (see nuance below). |
| 5 | Private / signed-URL `chat-media` | **Confirmed** | Upload still creates a **public** bucket and returns `getPublicUrl`. Membership is not required. |
| 6 | Live Stripe publishable key via EAS secrets | **Confirmed** | Both `__DEV__` and production branches in `stripeConfig.js` still assign a `pk_test_` key. No EAS extra overrides it. |
| 7 | App Store payment strategy (3.1.3(d) vs IAP) | **Confirmed** | Still Stripe Payment Sheet in-app; Restore purchases is still a support alert. Founder decision is still open. |
| 8 | Tighten realtime filters | **Confirmed** | Global `messages` INSERT has no filter; player `coaching_sessions` listener is unfiltered. Replica-identity SQL exists in-repo only. |
| 9 | Atomic unread increment + fail-closed daily cap + reject `system` | **Confirmed** | Read-then-write increment; daily-cap catch fail-open; `senderType: 'system'` allowed; list `userType` not bound to JWT role. |
| 10 | Persist tutorials; push or defer; smoke tests | **Confirmed** | Tutorials still `AsyncStorage` only; no `expo-notifications`; Jest finds **no tests**. |

None of the ten is refuted. None is Changed in a way that removes the work.

---

## 3. Detailed verification (priority items)

### #1 Unauthenticated Connect routes — Confirmed

`requireAuthenticatedUser` exists in `RefyneMobile/backend/routes/connect.js` (lines 25–62) and is used on:

| Route | Auth in code |
|-------|----------------|
| `POST /create-account` (321) | Yes; binds `coachId = user.id` (335–336) |
| `POST /account/:id/login-link` (515) | Yes + ownership |
| `POST /transfer` (796) | Yes + ownership |
| `GET /account/:id/balance` (900) | Yes |
| `GET /account/:id/payouts` (964) | Yes |
| `GET /coach/:coachId/onboarding-link` (1037) | Yes + ownership |
| `GET /coach/:coachId/transfers` (1135) | Yes (ownership gap if no DB row — see missed items) |

Still **unauthenticated** (no `requireAuthenticatedUser` in the handler):

| Route | Lines | What an unauthenticated caller can do |
|-------|-------|----------------------------------------|
| `GET /account/:id` | 413–458 | `stripe.accounts.retrieve(id)` — email, charges/payouts flags, business profile |
| `PUT /account/:id` | 464–509 | `stripe.accounts.update(id, updates)` |
| `POST /account/:id/onboarding-link` | 571–628 | Mint an Account Link for any `acct_` |
| `POST /start-onboarding` | 634–790 | Create an Express account from **body** `coachId` / email; this is the app’s real onboarding call |
| `GET /coach/:coachId/status` | 1467–1632 | DB lookup by coach id or `?email=`; returns Stripe status |
| `GET /coach/:coachId/status-original` | 1638+ | Same family |
| `GET /coaches/list` | 1875–1917 | `select('*')` from `coach_connect_accounts` (comment: “for debugging”) |

Client gap (must ship with the server fix or coaches break):

- `stripeConnectService.startOnboarding` posts **without** `Authorization` (`RefyneMobile/services/stripeConnectService.js` 265–270). `getAuthHeaders()` exists in the same file (21–27) and is used on other calls.
- `checkStripeAccountStatus` GETs `/api/connect/coach/${coachId}/status` with no Bearer token (153–159).
- `paymentService.getCoachConnectStatus` likewise GETs with only `Accept` (`RefyneMobile/services/paymentService.js` 335–342).

**Local runtime (placeholder Stripe keys, no Supabase service key):**

| Request (no `Authorization`) | Result | Meaning |
|------------------------------|--------|---------|
| `POST /api/connect/start-onboarding` `{}` | **400** `"coachId" is required` | Handler ran; not 401 |
| `GET /api/connect/coaches/list` | **500** `Cannot read properties of null (reading 'from')` | Handler ran; supabase client is null |
| `GET /api/connect/account/acct_aaaaaaaaaaaaaaaa` | **400** Stripe “Account not found” | Reached Stripe |
| `POST /api/connect/account/acct_aaaaaaaaaaaaaaaa/onboarding-link` | **500** Stripe “Invalid API Key” | Reached Stripe |
| `GET /api/connect/coach/fake-id/status` | **404** | Handler ran |
| `POST /api/connect/create-account` | **503** “Authentication requires Supabase…” | Auth gate works on the already-protected routes |
| `GET /api/connect/coach/fake-id/onboarding-link` | **503** | Same |

Acceptance criteria from the CoS canvas are still unmet: unauthenticated curl does **not** return 401.

### #2 Production RLS — Can't tell from code

Present in-repo (not proof of what production ran):

- Harden: `RefyneMobile/backend/sql/enable_rls_conversations_messages.sql` (ENABLE RLS; participant SELECT; `conversations_update_participant` with **no column restriction**, lines 19–30).
- Harden: `enable_rls_coaching_sessions_realtime.sql`, `add_blocks_reports_and_archived_at.sql`, `enable_profiles_avatar_read.sql`, `approved_coaches.sql`.
- Dangerous legacy: `RefyneMobile/backend/old queries/setup-conversations-database.sql` lines 48–61 — `DISABLE ROW LEVEL SECURITY` on conversations/messages and `GRANT ALL … TO anon`.
- No RLS SQL in `backend/sql/` for `coach_profiles`, `coach_connect_accounts`, or `payment_transfers`.
- Mobile uses the committed anon key (`RefyneMobile/supabaseClient.js`) and several screens query `conversations` / `coaching_sessions` directly (e.g. `HomeScreen.js` 121–126).

**Blocker:** production Security Advisor / applied-SQL check still needs a founder dashboard pass. This VM has no Supabase credentials.

### #3 Unread badge — Confirmed

Code-backed mechanisms (not re-reproduced on a device):

1. **Swallowed mark-read failures.** `markConversationAsRead` in `conversationService.js` 728–754 returns `null` on 429, “Rate limit exceeded”, and every other error. It does not throw.
2. **Coach one-shot.** `CoachesMessagesScreen.js` 95, 316–346: `markedReadRef.add` **before** the API call; local `unreadCount` is zeroed after `await`; the id is removed from the ref only in `catch`, which the service never hits. Re-open will not POST `/read` again.
3. **Player delay.** `CoachFeedbackScreen.js` 851–862: mark-read is `setTimeout(..., 1000)` after `loadMessages`. Leaving in that second skips the write. There is no `markedReadRef`, so retries are possible, but errors are still swallowed in `markAsRead` (796–816).
4. **Local-only open-thread suppression.** `liveSync.js` `setOpenConversationId` (92–98) and `applyConversationUnread` (55–63) force the in-memory map to 0 while a thread is open, without writing the DB. Inbound INSERTs increment the recipient column (`database.js` 2346–2360) and do not call mark-read.
5. **Three stores.** Tab badge = `unreadByConversation` map; list chips = React `unreadCount`; server = `player_unread_count` / `coach_unread_count`. Coach unread chip is a list reduce, not `useUnreadBadge()`.
6. **`POST /read` trusts body `userType`.** `conversations.js` 758–776: after membership check, `markConversationAsRead(conversationId, userType)` uses the Joi-validated **body**, not JWT metadata. A player participant can zero `coach_unread_count`.

### #4 Resume — Confirmed, with one nuance

Confirmed residual issues:

- `App.js` 254–264: any `AppState` transition to `active` (including Control Center `inactive` → `active`) calls `checkOnboardingStatus`. `utils/appForeground.js` 19–22 only fires on `background` → `active`.
- `App.js` 101–104: if `onboarding_completed` is not `'true'`, `onboardingCompleted` is set **false**. `NavigationContainer` is keyed on `nav-${initialRoute}-${refreshKey}` (`App.js` 388). A missing flag can dump a coach into `CoachOnboarding`.
- `components/Video.js`: `useVideoPlayer` with no AppState pause/release. Chat and tutorials embed it.
- `CoachesEarningsScreen.js` 243–261: any fetch error **zeros** totals.
- `liveSync.js` 186–196: unfiltered `messages` INSERT; 225–236: player `coaching_sessions` has no filter. Foreground catch-up + unread refresh (`266–272`) plus the 2s / 10-per-minute client limiter (`apiRateLimiter.js` 21–22) still pile onto resume.
- Open player chat on foreground reloads messages only (`CoachFeedbackScreen.js` 511–523), not clips/daily/expiry (those reload on selection change, 525–546).

**Nuance vs the canvas (not a refutation):** `HomeScreen.js` `buildFeedbackItem` 144–152 already keeps `previousItem` clip counters when both retries fail, and only writes `0/0` when there is no previous item. `CoachFeedbackScreen.js` 960 keeps last-known clips on error. First paint / first failure can still show 0; resume-with-cache is better than the canvas implied.

Device crash vs JS remount is still **Can't tell from code** (no TestFlight/Organizer logs on this VM).

### #5 Public `chat-media` — Confirmed

`RefyneMobile/backend/routes/upload.js`:

- 59–68: Bearer required to **upload**; any authenticated user (no conversation id).
- 85–86: path `videos/<timestamp>-<random>.<ext>` — guessable, not user-scoped.
- 97: on missing bucket, `createBucket(..., { public: true })`.
- 112, 122: `getPublicUrl` — permanent public HTTPS URL returned to the client.

Avatars follow the same public pattern (197, 215, 225). Database RLS does not protect Storage objects. Account-deletion SQL is best-effort path cleanup only.

### #6 `pk_test` in the production branch — Confirmed

`RefyneMobile/stripeConfig.js`:

- 7: `FORCE_PRODUCTION_URL = true`.
- 12–14: `publishableKey` is a `pk_test_…` string in **both** the `__DEV__` and else branches (value omitted). TODOs still say replace with `pk_live_` before App Store.
- 18–20: payment `backendUrl` is the production API host when `FORCE_PRODUCTION_URL` is true.
- No `app.json` / `eas.json` extra overrides the publishable key.

Whether TestFlight-on-test-keys is intentional remains a founder decision (CoS decision #2). Live vs test webhook registration is **Can't tell from code**.

### #7–#10 (brief)

- **#7 Confirmed.** `PaywallScreen.js` Stripe Payment Sheet; Restore (564–568) is an alert to contact support, not StoreKit. `ios/Refyne/PrivacyInfo.xcprivacy` has empty `NSPrivacyCollectedDataTypes`.
- **#8 Confirmed.** `liveSync.js` 186–196 unfiltered messages INSERT; 225–236 unfiltered player sessions. Replica identity FULL is in SQL (`enable_rls_coaching_sessions_realtime.sql` 28–29) — whether applied is unverified.
- **#9 Confirmed.** Non-atomic increment `database.js` 2348–2360; daily cap fail-open `conversations.js` 668–670; `senderType` includes `system` (190, 582–591); `GET /:userId/:userType` checks `user.id === userId` (380–385) but not that `userType` matches JWT role.
- **#10 Confirmed.** Tutorials: `AsyncStorage.setItem(\`tutorials_${user.id}\`)` in `CoachesTutorialsScreen.js` 50. Push: no `expo-notifications` in `package.json`; webhook TODOs in `routes/webhooks.js` 323–324, 340–342, etc. Tests: see §5.

---

## 4. Commands and results (what the static audit could not do)

VM: Linux, Node **v22.23.4**, npm **10.9.9**. **No Xcode, no Docker, no production credentials.** iOS compile, EAS submit, live Stripe/Supabase, and TestFlight were not run.

### 4.1 Install

```text
cd RefyneMobile && npm install --no-audit --no-fund
# exit 0; added 604 packages in 6s
# warnings: deprecated uuid@3.4.0, react-native-vector-icons@10.3.0

cd RefyneMobile/backend && npm install --no-audit --no-fund
# exit 0; added 418 packages in 3s
# warnings: deprecated supertest@6.3.4, glob@7, inflight, superagent@8
```

### 4.2 Lint / typecheck

**Missing.** Neither `RefyneMobile/package.json` nor `backend/package.json` defines `lint`, `typecheck`, or `tsc`. The app is JavaScript (no `tsconfig`). Nothing to run.

### 4.3 Tests

```text
cd RefyneMobile/backend && npm test -- --passWithNoTests
# > jest --passWithNoTests
# No tests found, exiting with code 0
```

`backend/package.json` has `"test": "jest"` and `supertest` in devDependencies. `backend/tests/` is **23 manual scripts** (`test-stripe.js`, `create-arthur-connect.js`, …), not `*.test.js`. Mobile `package.json` has no test script (no Jest/Detox).

### 4.4 Expo / EAS config

```text
cd RefyneMobile && npx expo-doctor
# 18/21 checks passed. 3 failed. exit 1
```

Failed checks:

1. **Expo config schema:** `app.json` `ios.splash` is not allowed (`ios.splash` extra property).
2. **CNG / prebuild sync:** committed `ios/` plus native fields in `app.json` (`scheme`, `orientation`, `icon`, `splash`, `ios`, `android`, `plugins`). EAS Build will **not** sync those from `app.json` while `ios/` is present.
3. **SDK 57 package versions:** 9 packages behind the SDK’s expected patch range (`expo` 57.0.21 vs expected ~57.0.33; `expo-video`, `expo-image-picker`, `expo-camera`, etc.). Confirmed again by `npx expo install --check` (exit 0, “Found outdated dependencies”).

```text
npx expo config --type public
# exit 0. Resolves name Refyne, slug RefyneMobile, scheme refynemobile,
# sdkVersion 57.0.0, platforms ios+android, iOS buildNumber 5,
# bundleIdentifier com.enoch.RefyneMobile, Stripe plugin + Apple Pay merchant id.
```

Identifiers, owner email, and EAS extras from `eas.json` / `app.json` are **not repeated** here.

iOS native build: **not possible on this VM** (`xcodebuild` missing). `expo run:ios` / `eas build` were not attempted.

### 4.5 Backend start

```text
node --check server.js          # exit 0

node server.js                  # no .env
# throw Error: STRIPE_SECRET_KEY is required
#   at backend/config/stripe.js:9
# exit 1
```

With **placeholder** Stripe keys (not real credentials) and no `SUPABASE_SERVICE_KEY`:

```text
STRIPE_SECRET_KEY=sk_test_placeholder_not_a_real_key \
STRIPE_PUBLISHABLE_KEY=pk_test_placeholder_not_a_real_key \
NODE_ENV=development PORT=3001 node server.js
```

Log:

```text
⚠️  Supabase service key is not properly configured. Using in-memory storage for conversations.
🚀 Server running on port 3001
```

`GET /health` → 200 `{"status":"OK",...,"environment":"development"}`.  
`GET /test` → 200 and `"stripeConfigured": true` (true because *any* `STRIPE_SECRET_KEY` is set — a placeholder counts).  
`GET /api/conversations/test/player` → 200 with node version, uptime, and `memoryUsage` (unauthenticated).

Docker image build: **not run** (`docker` missing).

---

## 5. Environment, build, migrations, release (as they actually exist)

### 5.1 Mobile

There is **no** `.env` / `app.config.js` / `EXPO_PUBLIC_*` usage. Runtime config is hardcoded:

- `RefyneMobile/supabaseClient.js` — Supabase URL + **anon JWT**
- `RefyneMobile/stripeConfig.js` — publishable key, Connect client id, backend URLs, `FORCE_PRODUCTION_URL`
- `paymentService.js` / `conversationService.js` — same `FORCE_PRODUCTION_URL` switch

Install / run (from `RefyneMobile/`):

| Intent | Command |
|--------|---------|
| Install | `npm install` |
| Metro / Expo Go | `npm start` (`expo start`) |
| iOS (needs Mac/Xcode) | `npm run ios` (`expo run:ios`) |
| EAS profiles | `eas.json`: `development` (dev client, simulator), `preview` (internal, device), `production` |
| Typical TestFlight | `eas build --platform ios --profile preview` then `eas submit --platform ios --profile production` |

iOS native project is committed (`RefyneMobile/ios/`). `app.json` still describes plugins and Info.plist strings; because `ios/` exists, **prebuild will not rewrite native files on EAS** (expo-doctor warning).

### 5.2 Backend env var **names** (no values)

From `RefyneMobile/backend/.env.example` and code:

| Name | Where |
|------|--------|
| `BACKEND_IMAGE` | compose / deploy |
| `PORT` | `server.js` (default 3001) |
| `NODE_ENV` | rate limits, CORS, error detail |
| `STRIPE_SECRET_KEY` | **required at process start** (`config/stripe.js`) |
| `STRIPE_PUBLISHABLE_KEY` | required at process start |
| `STRIPE_WEBHOOK_SECRET` | webhook signature |
| `STRIPE_CONNECT_CLIENT_ID` | documented |
| `STRIPE_CONNECT_REDIRECT_URI` | documented |
| `PLATFORM_FEE_PERCENTAGE` | default 15 in code |
| `SUPABASE_URL` | `database.js` (has a committed URL fallback) |
| `SUPABASE_ANON_KEY` | example / some test scripts |
| `SUPABASE_SERVICE_KEY` | backend; missing/placeholder → **in-memory fake chats** |
| `APP_URL` | Connect return/refresh URLs |
| `APP_NAME` | documented |
| `ALLOWED_ORIGINS` | CORS; empty → hardcoded LAN/VPS IPs in `server.js` 134–147 |
| `DATABASE_URL` | documented as unused |
| `ADMIN_USER_ID` | **used in payments/connect, not in `.env.example`** |

GitHub Actions also uses `GITHUB_TOKEN` and optional secret `DEPLOY_PATH`.

Copy path: `cp RefyneMobile/backend/.env.example RefyneMobile/backend/.env` (never commit `.env`; gitignored).

### 5.3 Backend run / deploy

| Path | Evidence |
|------|----------|
| Local | `npm start` / `npm run dev` in `RefyneMobile/backend` after filling `.env` |
| Intended prod | GitHub Actions `.github/workflows/deploy.yml` → GHCR image `refyne-backend` → self-hosted runner `docker compose pull && up -d` |
| Compose | `docker-compose.yaml` binds `127.0.0.1:3001`; needs `BACKEND_IMAGE` |
| TLS | `Caddyfile.example` on the host |
| Legacy | `ecosystem.config.js` + `VPS_DEPLOYMENT.md` (PM2). **Which process is live is still unverified** (CoS decision #3). |

`GET /health` is the process healthcheck (`Dockerfile`).

### 5.4 Migrations

There is **no** migration runner (no Prisma, no supabase/migrations CI). Schema changes are:

1. Manual SQL in the Supabase SQL editor from `RefyneMobile/backend/sql/*.sql` and `DATABASE_SETUP.md` / `setup-database-tables.js`.
2. **Do not re-run** `backend/old queries/setup-conversations-database.sql` (disables RLS).

Which of those files production actually applied is still unknown.

### 5.5 Release / TestFlight

- App version `1.0.0`, iOS `buildNumber` `5` (`app.json`).
- Stripe plugin + merchant identifier in `app.json` plugins; Apple Pay entitlement in the iOS project.
- Submit metadata lives in `eas.json` `submit.production.ios` (Apple ids not repeated here).
- CI does **not** lint, test, or EAS-build the mobile app; it only builds/pushes the backend image on `RefyneMobile/backend/**` changes.

---

## 6. Significant items the static audit missed or underweighted

These do not replace the top-10. They are extras this pass found in code or at runtime.

1. **Conversation `sessionId` is not bound to a paid session.** `POST /api/conversations` (`conversations.js` 832–890) accepts body `sessionId` after “caller is player or coach”. `findOrUpdateConversation` (`database.js` 2024–2042) writes `session_id` with no check that `coaching_sessions` belongs to that player/payment. Combined with the unrestricted `conversations_update_participant` policy (#2/#P1), this is an **entitlement path** the canvas listed only as a column-restriction issue, not as an API hijack.
2. **`POST /api/connect/transfer` takes `amount` from `req.body`** (`connect.js` 801, 856) after ownership checks. Destination charges are server-priced; this path is not. Not in the top-10.
3. **Client Connect calls that will 401 after #1 if left unchanged.** `startOnboarding`, `checkStripeAccountStatus`, and `getCoachConnectStatus` omit Bearer tokens (see §3 #1). The smallest *safe* patch must include those three call sites.
4. **`GET /coach/:coachId/transfers` ownership is skippable.** `connect.js` 1162: `if (account && !isAdmin && …)` — if no `coach_connect_accounts` row, the 403 is skipped. Then `getCoachConnectAccountId(coachId)` still runs.
5. **Connect vs payments API hosts.** `STRIPE_CONNECT_CONFIG.backendUrl` uses the `app.` host; payment/conversation services use the `api.` host (`stripeConfig.js` 18–20 vs 38–40). CoS noted this as unverified DNS; the **client is configured to call two different hosts**.
6. **`GET /api/conversations/test/player` and `GET /test` are live.** Runtime 200s. The test route returns process memory/uptime. CoS listed the conversation probe as P3; it is still unauthenticated and skipped by rate limit (`server.js` 44, 101).
7. **Expo-doctor failures** (schema `ios.splash`, CNG drift, 9 stale SDK 57 patches). Invisible in a static read; they will bite the next EAS/prebuild.
8. **No lint, no typecheck, no Jest cases**, despite `jest` + `supertest` on the backend. CoS said CI is Docker-only; this pass proved `npm test` is a no-op.
9. **Backend boot: Stripe keys required; Supabase optional.** Missing Stripe → crash. Missing service key → in-memory sample conversations (`database.js` 11–13, 19+). A misconfigured VPS can serve fake chats instead of failing closed.
10. **`ADMIN_USER_ID` is used and undocumented** in `.env.example`.
11. **Committed credential material (paths + types only, urgent to rotate/move):**
    - `RefyneMobile/supabaseClient.js` — anon JWT
    - `RefyneMobile/stripeConfig.js` — Stripe publishable **test** key; Connect client id
    - `RefyneMobile/backend/services/database.js` — service-role-**shaped** JWT placeholder (`YourServiceKeyHere`); currently invalid, but a real key pasted here would be a committed god-key
    - Several `backend/tests/*.js` and `setup-database-tables.js` — anon JWT fallbacks
12. **`GET /coach/:id/transfers` lists up to 100 PaymentIntents from the platform Stripe account** then filters (`connect.js` ~1204). Worth a follow-up read: over-fetch plus a filter bug would leak other coaches’ payment metadata to the caller.

Founder decisions from the canvas (RLS dashboard, webhook live/test, VPS Docker vs PM2, 3.1.3(d) vs IAP, push, crash logs, Android, tutorials persistence) are **still undecided** as far as this repo can tell.

---

## 7. Proposed next change (do not implement in this PR)

**Task:** CoS #1 — auth-gate remaining Connect routes. Effort S. No dashboard work required.

### Smallest safe patch

Stay inside two files on the server and the two client Connect callers. Do not refactor the whole router.

**Server (`RefyneMobile/backend/routes/connect.js`):**

1. At the top of each currently open handler, `const user = await requireAuthenticatedUser(req, res); if (!user) return;` — same helper already used on `create-account`.
2. Bind identity like `create-account` already does (335–336):
   - `POST /start-onboarding`: ignore body `coachId`; set `value.coachId = user.id`. Reject if a client-supplied `coachId` disagrees (403) rather than silently creating an account for someone else.
   - `GET /coach/:coachId/status` and `status-original`: require `String(user.id) === String(coachId)` unless `ADMIN_USER_ID` matches. **Stop using `?email=` as an unauthenticated lookup.** Email lookup, if kept, must be admin-only.
   - `GET/PUT /account/:id` and `POST /account/:id/onboarding-link`: same ownership query as `login-link` (525–546) — `coach_connect_accounts.stripe_account_id = id` and `coach_id === user.id` (or admin).
3. `GET /coaches/list`: **delete the route** (debug dump). If someone still needs it, admin-only + 404 for everyone else. Prefer delete.
4. Do not change destination-charge, webhook, or transfer logic in this patch.

**Client (required or onboarding/status break):**

1. `stripeConnectService.startOnboarding`: pass `headers: await getAuthHeaders()` on the POST (pattern already used by `getOnboardingLink` at 312–314).
2. `stripeConnectService._fetchStripeAccountStatus`: same Bearer header on the GET.
3. `paymentService.getCoachConnectStatus`: send `Authorization: Bearer <access_token>` like other payment calls.

**Out of scope for this patch:** RLS, unread, signed URLs, live `pk_live`, transfer `amount` body, `sessionId` binding.

### Tests that should prove it

Add real Jest + supertest next to `backend/` (today `npm test` matches nothing). Suggested cases; mock Stripe and `getUserFromAccessToken`:

| Case | Expect |
|------|--------|
| Unauthenticated `GET /api/connect/coaches/list` | 401 (or 404 if deleted) |
| Unauthenticated `POST /api/connect/start-onboarding` | **401**, not 400 validation |
| Unauthenticated `GET /api/connect/account/acct_x` | 401, Stripe `retrieve` **not** called |
| Unauthenticated `PUT /api/connect/account/acct_x` | 401, Stripe `update` not called |
| Unauthenticated `POST /api/connect/account/acct_x/onboarding-link` | 401 |
| Unauthenticated `GET /api/connect/coach/:id/status` | 401 |
| Coach A token + `start-onboarding` body `coachId` = Coach B | 403; no `accounts.create` for B |
| Coach A token + `GET /account/:id` for B’s `acct_` | 403 |
| Coach A token + `GET /coach/A/status` | 200 (mocked Stripe/DB) |
| Already-gated `POST /create-account` without token | still 401/503 |

Do **not** hit live Stripe or production. After merge, a founder TestFlight pass: coach Earnings → Connect onboarding still opens (proves the client header change).

---

## 8. Blockers (credentials this VM does not have)

- Production `SUPABASE_SERVICE_KEY` / dashboard (RLS, bucket public flags, applied SQL).
- Stripe Dashboard (webhook endpoint, live vs test mode).
- VPS SSH (Docker vs PM2, which hostname terminates where).
- Apple / EAS credentials (cannot `eas build` or inspect TestFlight crashes).
- Xcode / iOS Simulator (cannot `expo run:ios` here).
- Docker (cannot build the backend image here).

---

## 9. Bottom line

HEAD is still `405a28f`. The CoS top-10 is still accurate. Local install works; lint/typecheck/tests effectively do not exist; Expo doctor reports three real config issues; the backend boots only with Stripe keys present and **fails open** into in-memory chats without a service key. Unauthenticated Connect routes are confirmed both in source and by local curl.

The first engineering change should be the Connect auth patch in §7, including the three client callers that today send no Bearer token.
