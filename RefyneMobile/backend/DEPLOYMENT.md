# Backend deployment (Docker + VPS + Caddy)

This guide matches the repo layout: the API runs in **Docker** on your VPS, **Supabase** hosts the database and auth (no Postgres container), the image is built and pushed to **GHCR** by GitHub Actions, and **Caddy** on the host terminates HTTPS and proxies to the container.

Related files:

- `Dockerfile` — production image
- `docker-compose.yaml` — VPS: pull image, run API on `127.0.0.1:3001`
- `.env.example` — copy to `.env` on the server; never commit `.env`
- `Caddyfile.example` — host reverse proxy + TLS
- `.github/workflows/deploy.yml` — build/push to GHCR; optional deploy via self-hosted runner

---

## 1. Architecture

| Component | Where it runs |
|-----------|----------------|
| API (Express, Stripe, uploads, etc.) | Docker on the VPS |
| PostgreSQL + Auth | Supabase (cloud) |
| TLS (HTTPS) | Caddy on the **host**, → `127.0.0.1:3001` |
| Container image | Built in GitHub Actions → **GHCR** (`ghcr.io/<lowercase-github-owner>/refyne-backend`) |

`docker-compose.yaml` publishes the API as **`127.0.0.1:3001:3001`**, so port 3001 is not exposed on the public interface. Clients use **HTTPS on 443** (via Caddy).

---

## 2. Prerequisites

### DNS

1. Choose an API hostname, e.g. `api.yourdomain.com`.
2. Add an **A record**: hostname → **VPS public IPv4**.
3. Wait until DNS resolves before relying on Let’s Encrypt.

### GitHub

1. Workflow path filters: pushes to **`main`** or **`master`** under `RefyneMobile/backend/` (or changes to `.github/workflows/deploy.yml`).
2. For GHCR pushes from Actions, the workflow uses `GITHUB_TOKEN` with `packages: write` (already set in the workflow).
3. The image path uses the **lowercased** repository owner: `ghcr.io/<owner>/refyne-backend`.

### Environment variables (`.env` on the server)

Start from `.env.example` and set at least:

- **Stripe**: `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`
- **Supabase**: `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` (server only; never put the service key in the mobile app)
- **Docker**: `BACKEND_IMAGE=ghcr.io/<lowercase-owner>/refyne-backend:latest`
- **Public API URL**: `APP_URL=https://api.yourdomain.com` (must match the URL users and Stripe hit)

Optional:

- **CORS**: `ALLOWED_ORIGINS` — native mobile requests often send **no** `Origin` header (allowed by `server.js`). Set this if you use Expo Web, a browser, or a WebView that sends `Origin`.
- **Stripe Connect**: `STRIPE_CONNECT_CLIENT_ID`, `STRIPE_CONNECT_REDIRECT_URI` if you use Connect onboarding.

### Stripe Dashboard

- **Webhook URL**: `https://api.yourdomain.com/api/webhooks/stripe` (POST; see `routes/webhooks.js`).
- Use the signing secret as `STRIPE_WEBHOOK_SECRET`.
- Stripe Connect return/refresh URLs must align with `APP_URL` and your Connect configuration.

### Supabase

- Enable/configure Storage and RLS as needed for chat media, avatars, etc.
- Use the **service role** key only on the backend.

---

## 3. One-time VPS setup

### Install Docker

Install Docker Engine and the Compose plugin on the VPS (Ubuntu/Debian on RackNerd is typical). Verify:

```bash
docker --version
docker compose version
```

### Deploy directory

Pick a directory that will contain **`docker-compose.yaml`** and **`.env`** side by side.

- Default path expected by `.github/workflows/deploy.yml` (if you use a self-hosted runner and do not set a secret):  
  `/home/github-runner/refyne-backend`
- To use another path, set the GitHub repository secret **`DEPLOY_PATH`** to that absolute path.

Copy from this repo into that directory:

1. `RefyneMobile/backend/docker-compose.yaml`
2. `RefyneMobile/backend/.env.example` → rename to **`.env`** and fill in real values (including `BACKEND_IMAGE`).

### Log in to GHCR on the VPS

Required to **pull** private images (and good practice for public ones):

1. Create a GitHub **Personal Access Token** with **`read:packages`** (and repo access as needed).
2. On the VPS:

```bash
echo YOUR_GITHUB_PAT | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin
```

---

## 4. Getting the image onto GHCR

### Option A — Push to `main` / `master` (cloud build)

Merge or push changes under `RefyneMobile/backend/` to the default branch. The **build-and-push** job runs on `ubuntu-latest`, builds `./RefyneMobile/backend`, and pushes tags including **`latest`** for the default branch.

### Option B — Manual workflow run

In GitHub: **Actions** → **Build & deploy backend** → **Run workflow**.

---

## 5. Running the API on the VPS

### Manual deploy (no self-hosted runner)

From the deploy directory (where `docker-compose.yaml` and `.env` live):

```bash
docker compose pull
docker compose up -d --remove-orphans
docker compose ps
```

Ensure `.env` defines **`BACKEND_IMAGE`** (compose substitutes it for the `image:` field).

### Automatic deploy (self-hosted runner)

1. Register a **self-hosted** GitHub Actions runner on the VPS (repo **Settings** → **Actions** → **Runners**).
2. Ensure the deploy directory exists and contains **`docker-compose.yaml`** and **`.env`**.
3. On each successful workflow run, the **deploy** job sets `BACKEND_IMAGE`, runs `docker compose pull`, then `docker compose up -d`.

If `docker-compose.yaml` is missing in the deploy directory, the job fails until you copy it there (the workflow does not copy it automatically).

---

## 6. HTTPS with Caddy (host)

1. Install Caddy on the **host** (install hints are in `Caddyfile.example`).
2. Configure a site that reverse-proxies to the API:

```text
api.yourdomain.com {
    reverse_proxy 127.0.0.1:3001
}
```

3. Reload Caddy (e.g. `sudo systemctl reload caddy`).

Let’s Encrypt requires **port 80** (and 443) reachable on the VPS for that hostname.

### Firewall

- Allow **80** and **443** from the internet (for Caddy).
- Do **not** expose **3001** publicly when using `127.0.0.1:3001` in Compose.

---

## 7. Verification

On the VPS:

```bash
curl -sS http://127.0.0.1:3001/health
```

From your machine:

```bash
curl -sS https://api.yourdomain.com/health
```

If HTTPS fails, check DNS, firewall, and Caddy logs (e.g. `journalctl -u caddy -e`).

---

## 8. Mobile app configuration

Point the client’s API base URL to **`https://api.yourdomain.com`** (match your real hostname and whether your client expects a trailing slash).

---

## 9. Ongoing updates

- **With self-hosted runner**: push backend changes to the default branch → new image → runner pulls and restarts containers.
- **Manual only**: after a new `latest` is on GHCR, on the VPS run:

```bash
cd /path/to/deploy/dir
docker compose pull && docker compose up -d --remove-orphans
```

---

## 10. Temporary testing without Caddy

To hit the API from another machine over HTTP before TLS is ready, you can temporarily change `docker-compose.yaml` from `127.0.0.1:3001:3001` to `3001:3001`, open the host firewall for 3001, test, then **revert** to loopback binding and use Caddy for production.

---

## Summary checklist

1. DNS **A** record → VPS IP  
2. `.env` on server from `.env.example` + `BACKEND_IMAGE` + secrets + `APP_URL`  
3. `docker-compose.yaml` + `.env` in the same deploy directory  
4. `docker login ghcr.io` on the VPS  
5. Image on GHCR (`docker compose pull` / CI)  
6. `docker compose up -d`  
7. Caddy → `127.0.0.1:3001`, ports 80/443 open  
8. Stripe webhook → `https://<host>/api/webhooks/stripe`  
9. App API URL → `https://<host>`

Kubernetes is optional and not required for this VPS setup; see `kubernetes/` only if you move to a cluster later.
