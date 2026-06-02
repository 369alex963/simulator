# Audit A5 — Production Deployment Readiness (Cloudways)

Scope: `c:\Users\alex\Documents\KernelVideo\Simulator-New\new-version`
Target: Cloudways managed VPS (nginx + Apache + supervisor, no Docker).
Stack: Django 5 + DRF, Next.js 15, PostgreSQL prod / SQLite dev.

This audit is read-only. No code was modified.

---

## Inventory

### 1. Django settings hardening
- `SECRET_KEY` env-driven with dev fallback = **present** (settings.py:31-38; hard-fails when `DEBUG=False` and fallback unchanged — GOOD)
- `DEBUG` env-driven via `DJANGO_DEBUG` = **present** (default `True` — see Findings)
- `ALLOWED_HOSTS` env-driven, `*` only when DEBUG = **present** (settings.py:40-45)
- `SESSION_COOKIE_HTTPONLY` = **present** (settings.py:134, hard-coded `True`)
- `SESSION_COOKIE_SAMESITE` = **present** (`"Lax"`, settings.py:135)
- `SESSION_COOKIE_SECURE` = **present** (`not DEBUG`, settings.py:136)
- `CSRF_COOKIE_SECURE` = **missing**
- `CSRF_COOKIE_HTTPONLY` = **missing**
- `CSRF_COOKIE_SAMESITE` = **missing** (Django default `Lax`, acceptable but not explicit)
- `SECURE_PROXY_SSL_HEADER` = **missing**
- `SECURE_SSL_REDIRECT` = **missing**
- `SECURE_HSTS_SECONDS` / `SECURE_HSTS_INCLUDE_SUBDOMAINS` / `SECURE_HSTS_PRELOAD` = **missing**
- `SECURE_CONTENT_TYPE_NOSNIFF` = **missing** (Django default `True` since 4.0 — acceptable)
- `SECURE_REFERRER_POLICY` = **missing** (Django default `"same-origin"` since 3.0 — acceptable)
- `X_FRAME_OPTIONS` = **missing** (Django default `"DENY"` — acceptable; middleware enabled)
- `CSRF_TRUSTED_ORIGINS` env-driven = **present** (settings.py:193-196 — uses `DJANGO_CORS_ORIGINS`; defaults include `10.5.0.2` LAN IP)
- `CORS_ALLOW_ALL_ORIGINS` = **conditional** (set to `True` only when DEBUG — GOOD; settings.py:184-191)
- `CORS_ALLOWED_ORIGINS` env-driven = **present** (settings.py:188-191)
- `CORS_ALLOW_CREDENTIALS` = **present** (`True`)

### 2. Database
- PostgreSQL configurable via env (`DB_ENGINE`/`DB_NAME`/`DB_USER`/...) = **wrong** — `.env.example` and `RUNBOOK.md` advertise these vars but `settings.py:111-116` hard-codes `sqlite3` and never reads them.
- `DATABASE_URL` support = **missing**
- `psycopg[binary]==3.2.3` in requirements = **present**
- All migrations checked in = **present** (every app with models has migrations; `analytics`, `exports`, `moodle`, `support` have empty `models.py` — no migrations needed)

### 3. Static + media
- `STATIC_URL`, `STATIC_ROOT` = **present** (`/static/`, `BASE_DIR/staticfiles`)
- `MEDIA_URL`, `MEDIA_ROOT` = **present** (`/media/`, `BASE_DIR/media`)
- WhiteNoise = **missing** (not in `requirements.txt`, not in `MIDDLEWARE`, no `STATICFILES_STORAGE`)
- `collectstatic` runnable = **present** (`STATIC_ROOT` set, no compressor configured)
- Media served by Django in prod = **wrong** — `kernelios/urls.py:45` reads `if settings.DEBUG or True:` so Django serves `/media/` unconditionally. Comment says "brand-kit assets must work" but this defeats the prod web-server hand-off.

### 4. Logging
- `LOGGING` dict in settings = **missing** entirely
- Rotating file handler = **missing**
- Console + file in prod = **missing**
- Sensitive data redaction = **partial** — `apps/audit/signals.py:94-96` redacts the `password` field in audit log diffs (GOOD). No other PII redaction logic. No request body logging exists, so passwords-in-logs is unlikely, but no defensive `LOGGING` filter is in place.

### 5. Requirements / deps
- `requirements.txt` exists, all pins exact (`==`) = **present**
- `gunicorn` = **missing**
- `whitenoise` = **missing**
- `psycopg[binary]` = **present**
- `dj-database-url` = **missing**
- `django-environ` = **missing** (using `python-dotenv` + manual `os.getenv` instead — acceptable)
- Dev-only deps separated = **missing** (no `requirements-dev.txt`, but no obvious dev-only deps in main file either — acceptable)

### 6. Email
- `EMAIL_BACKEND` setting = **missing** (never set in `settings.py`; Django default = SMTP backend on localhost:25 — never invoked because the project bypasses Django email entirely)
- SMTP env-driven = **wrong by design** — `apps/notifications/email_service.py` reads SMTP credentials from a DB-stored `AppConfig` singleton via raw `smtplib`, not from settings or env. `.env.example` lists `EMAIL_HOST=…` etc. but nothing reads them.

### 7. Frontend prod config
- `next.config.ts` proxy uses `NEXT_PUBLIC_API_URL` = **present** (defaults to `http://127.0.0.1:8000`)
- `package.json` `start` script = **present** (`next start --hostname localhost --port 3000`) — `--hostname localhost` only binds to loopback (OK for nginx reverse proxy on same host, but won't accept LAN connections directly)
- Image `remotePatterns` allowlist = **partial** — allows `localhost`, `127.0.0.1`, `10.5.0.2` and `https://**`. Production-hostname allowlist via env = **missing**.
- `outputFileTracingRoot: __dirname` = **present** (good for monorepo build correctness)
- `output: "standalone"` or static export config = **missing** (running via `next start` is the assumed mode)

### 8. Repo hygiene
- `.gitignore` at `new-version/` root = **present**
  - `.env` (backend) = **ignored**
  - `db.sqlite3` = **ignored**
  - `media/` = **ignored**
  - `.venv/` = **ignored**
  - `__pycache__/` = **ignored**
  - `staticfiles/` = **ignored**
  - `*.mmdb` (GeoIP DB) = **ignored**
  - `node_modules/` = **ignored**
  - `.next/` = **ignored**
  - `.env.local` / `.env.production` (frontend) = **ignored** (root file + frontend has its own `.env*` ignore)
  - `logs/` = **missing** (no `logs/` directory exists in `new-version/`, so not yet a concern)
  - Lock files preserved (NOT ignored) = **present** (`package-lock.json` is checked in)
- Committed secrets = **partial concern**:
  - `backend/.env` exists on disk (gitignored, so not committed) but contains the literal placeholder `DJANGO_SECRET_KEY=change-me-to-a-long-random-string` — harmless because DEBUG=true
  - `apps/accounts/management/commands/seed_admin.py:42` hard-codes seed admin password `Admin1234!` — by design, with prominent warning to change immediately. Acceptable for a seed command.
  - No tokens / cloud creds in tracked source
- `.env.example` = **present** but **incomplete** — lists DB/Redis/Email vars that settings.py doesn't actually read.

### 9. Run/deploy scripts
- `run.bat` (dev) = **present**
- `deploy.sh` = **missing**
- `Procfile` = **missing**
- supervisor config (`*.ini` / `*.conf`) = **missing**
- nginx snippet = **missing**
- `docs/RUNBOOK.md` = **present** but marked "placeholder for now" — 38 lines, references env vars settings.py doesn't read, suggests Vercel for frontend (contradicts Cloudways same-host plan).

### 10. Health checks + ops endpoints
- `GET /api/health/` = **present** (`apps/core/views.py:8-24`, returns `{status, system, version, db}` with DB connection check)
- Readiness vs liveness split = **missing** (single endpoint covers both — acceptable for this scale)
- `/api/version/` standalone = **missing** (version embedded in health response — acceptable)

### 11. Frontend build
- `next build` blockers visible from static inspection = **none obvious**
  - `tsconfig.json` is `"strict": true` — any TS errors will fail build
  - `next.config.ts` is valid
  - `package.json` deps resolve (Next 15.5.18, React 19.2.4)
  - Dev log shows one runtime `SyntaxError: Unexpected end of JSON input` on `/login` (this is a server-side fetch failure when backend is down — won't block `next build` because pages are not statically generated for that route)
- Not verified by running the build (read-only audit)

---

## Findings

### CRITICAL — must fix before deploy

- **C1: Production DB is hard-coded to SQLite.** `settings.py:111-116` ignores `DB_ENGINE`/`DB_NAME`/`DB_USER`/`DB_PASSWORD`/`DB_HOST`/`DB_PORT` (and `DATABASE_URL`). The `.env.example` and `RUNBOOK.md` advertise these vars; setting them on Cloudways will silently do nothing and the app will run on a writable SQLite file on the VPS (loses data on rebuild, no concurrency, no backups). Wire `DATABASES["default"]` to read env vars; keep SQLite as the dev fallback when `DB_ENGINE` is unset or equals `django.db.backends.sqlite3`.

- **C2: Media files served by Django in production.** `kernelios/urls.py:45` reads `if settings.DEBUG or True:` — the `or True` defeats the DEBUG gate. In prod this routes every `/media/*` request through Django, which is slow, holds gunicorn workers, and is the documented anti-pattern. Replace with `if settings.DEBUG:` and configure nginx to serve `MEDIA_ROOT` directly (or front it via WhiteNoise if simpler).

- **C3: WhiteNoise not installed.** No package, no middleware, no storage backend. With nginx in front of Apache+gunicorn this is technically optional (nginx can serve `STATIC_ROOT` directly), but Cloudways' canned Python app stack typically needs WhiteNoise to serve admin/DRF static assets without a custom nginx vhost edit. Add `whitenoise[brotli]` to `requirements.txt`, insert `whitenoise.middleware.WhiteNoiseMiddleware` immediately after `SecurityMiddleware`, and set `STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"`.

- **C4: `gunicorn` not in requirements.** `wsgi.py` exists, but the WSGI server is not listed. Cloudways will not auto-install it. Add `gunicorn==23.0.0` (or current pin) and document the supervisor/procfile entrypoint.

- **C5: `SECURE_PROXY_SSL_HEADER` not set.** Behind nginx terminating TLS, Django will see `request.is_secure() == False`, which breaks `SESSION_COOKIE_SECURE` cookie issuance and HTTPS redirects. Set `SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")` and ensure nginx forwards that header.

### HIGH — strongly recommended before deploy

- **H1: `DEBUG` defaults to `True`.** `settings.py:29` defaults `DJANGO_DEBUG` to `True` when the env var is absent. Cloudways deployments that forget to set `DJANGO_DEBUG=false` will boot in DEBUG mode and leak tracebacks. Flip the default to `False` and make local dev set `DJANGO_DEBUG=true` in its `.env` (already does).

- **H2: No HTTPS / HSTS settings.** Missing `SECURE_SSL_REDIRECT`, `SECURE_HSTS_SECONDS`, `SECURE_HSTS_INCLUDE_SUBDOMAINS`, `SECURE_HSTS_PRELOAD`. With nginx already redirecting HTTP→HTTPS this is partially covered, but Django should also enforce HSTS for defense in depth. Recommend setting HSTS to 3600 first, then 31536000 once verified.

- **H3: `CSRF_COOKIE_SECURE` not set.** Session cookie is gated on `not DEBUG`; CSRF cookie is not. Add `CSRF_COOKIE_SECURE = not DEBUG` and `CSRF_COOKIE_HTTPONLY = True`.

- **H4: No `LOGGING` config.** Default Django logging writes to stderr only and a runaway error in prod is hard to diagnose. Add a `LOGGING` dict with a rotating file handler at `BASE_DIR / "logs" / "django.log"` (10 MB × 5 backups), `INFO` level for `django` and `apps`, `ERROR` level for `django.security`. Also pipe `django.request` and `django.security.*` so 4xx/5xx are visible.

- **H5: Email configuration mismatch.** `.env.example` lists `EMAIL_HOST`/`EMAIL_PORT`/... but the codebase ignores them and uses DB-stored SMTP via `apps/notifications/email_service.py`. Either: (a) delete the email vars from `.env.example` to avoid operator confusion, or (b) wire Django's `EMAIL_*` settings from env and migrate `email_service.py` to `django.core.mail.send_mail`. Current bypass means: no DEBUG-console fallback, raw `smtplib` errors swallowed as string returns, and SMTP creds live in the DB (visible to anyone with DB read).

- **H6: RUNBOOK.md is a placeholder.** Lists env vars that aren't read (DB_*, REDIS_URL), suggests Vercel for frontend (Cloudways same-host is the actual plan), and has no supervisor/nginx/Apache snippets. Expand to cover: gunicorn supervisor entry, `next start` supervisor entry, nginx upstream + reverse proxy config, TLS, static/media file roots, log rotation, backup strategy.

- **H7: No deploy script / Procfile / supervisor config.** Cloudways uses supervisor + nginx; nothing in the repo describes how to start gunicorn or `next start`. Add `deploy/supervisor.conf` (or equivalent) so the deploy is reproducible.

- **H8: Password validator minimum length is 6.** `settings.py:121-126` only registers `MinimumLengthValidator` with `min_length=6`. Standard guidance is 8+, plus `UserAttributeSimilarityValidator`, `CommonPasswordValidator`, and `NumericPasswordValidator`. Low for a multi-tenant exam platform.

### MEDIUM — recommended cleanup

- **M1: `APPEND_SLASH = False`** (`settings.py:201`) combined with Next.js rewriting `/api/:path*` → `/api/:path*/` (`next.config.ts:14-17`) means the frontend always appends a slash before forwarding. Direct backend calls without slash will 404. Document this contract and/or set `APPEND_SLASH = True`.

- **M2: `CSRF_TRUSTED_ORIGINS` defaults include LAN IP** (`http://10.5.0.2:3000`). Fine for dev, but if `DJANGO_CORS_ORIGINS` is unset in prod the default leaks in. Make the default empty in production, or read a separate `DJANGO_CSRF_TRUSTED_ORIGINS` env var.

- **M3: `CORS_ALLOWED_ORIGINS` and `CSRF_TRUSTED_ORIGINS` share `DJANGO_CORS_ORIGINS`.** Acceptable but not always the same set (e.g., admin via subdomain). Split into two env vars for flexibility.

- **M4: Frontend `next start --hostname localhost`** binds Next.js to 127.0.0.1 only. Good for same-host nginx reverse proxy, but means health checks from another machine on the VPN won't hit the Node process directly. If Cloudways supervisor runs both services on the same box, this is fine; otherwise switch to `0.0.0.0`.

- **M5: Image `remotePatterns` includes `https://**`** — any HTTPS host can be used in `<Image>` `src`. Tighten to expected brand-kit CDN hosts.

- **M6: Redis listed in requirements but no `CACHES` setting.** `redis==5.0.8` and `django-redis==5.4.0` are pinned, but `settings.py` has no `CACHES` dict, so they are dead weight in dev and unused even when `REDIS_URL` is set. Either wire `CACHES` from `REDIS_URL` (with a `LocMem` fallback) or drop the deps.

- **M7: GeoIP DB path** (`backend/data/GeoLite2-Country.mmdb`) is gitignored but `.env.example` doesn't mention provisioning it. Add a RUNBOOK step.

### LOW — nice-to-have

- **L1: `kernelios/settings/` empty directory** sits next to `settings.py`. Looks like an aborted split. Either remove it or finish the split into `base.py`/`dev.py`/`prod.py`.

- **L2: `apps.core.urls` mounts the audit log under `/api/audit-log/`** while `apps.audit` mounts under `/api/audit/`. Two audit URL trees is mildly confusing; consider consolidating.

- **L3: Health endpoint does not validate Redis / cache.** When Redis is wired, extend `/api/health/` to ping it.

- **L4: `seed_admin.py` hard-codes `Admin1234!`.** Acceptable for a one-shot seed with prominent warning, but consider reading from `DJANGO_SEED_ADMIN_PASSWORD` env var with a generated default printed once.

- **L5: `frontend/.env.local` is committed to disk** (gitignored by `.env*` rule). Harmless content. Consider renaming to `.env.local.example`.

- **L6: `package-lock.json` is checked in — good.** No yarn lock conflict.

- **L7: `DJANGO_ALLOWED_HOSTS` `.env` has trailing `*`** (`backend/.env:6`). With current DEBUG=true this is a no-op (DEBUG forces `["*"]`), but if `DJANGO_DEBUG` flips false without clearing `.env`, this string will be parsed as a literal host `*` which Django *will* honor as wildcard — easy footgun. Strip `*` from defaults in production env.

---

## Files inspected (absolute paths)

- `c:\Users\alex\Documents\KernelVideo\Simulator-New\new-version\backend\kernelios\settings.py`
- `c:\Users\alex\Documents\KernelVideo\Simulator-New\new-version\backend\kernelios\urls.py`
- `c:\Users\alex\Documents\KernelVideo\Simulator-New\new-version\backend\kernelios\wsgi.py`
- `c:\Users\alex\Documents\KernelVideo\Simulator-New\new-version\backend\requirements.txt`
- `c:\Users\alex\Documents\KernelVideo\Simulator-New\new-version\backend\.env`
- `c:\Users\alex\Documents\KernelVideo\Simulator-New\new-version\backend\.env.example`
- `c:\Users\alex\Documents\KernelVideo\Simulator-New\new-version\backend\apps\core\views.py`
- `c:\Users\alex\Documents\KernelVideo\Simulator-New\new-version\backend\apps\core\urls.py`
- `c:\Users\alex\Documents\KernelVideo\Simulator-New\new-version\backend\apps\notifications\email_service.py`
- `c:\Users\alex\Documents\KernelVideo\Simulator-New\new-version\backend\apps\audit\middleware.py`
- `c:\Users\alex\Documents\KernelVideo\Simulator-New\new-version\backend\apps\audit\signals.py`
- `c:\Users\alex\Documents\KernelVideo\Simulator-New\new-version\backend\apps\accounts\management\commands\seed_admin.py`
- `c:\Users\alex\Documents\KernelVideo\Simulator-New\new-version\frontend\next.config.ts`
- `c:\Users\alex\Documents\KernelVideo\Simulator-New\new-version\frontend\package.json`
- `c:\Users\alex\Documents\KernelVideo\Simulator-New\new-version\frontend\tsconfig.json`
- `c:\Users\alex\Documents\KernelVideo\Simulator-New\new-version\frontend\.env.local`
- `c:\Users\alex\Documents\KernelVideo\Simulator-New\new-version\frontend\.gitignore`
- `c:\Users\alex\Documents\KernelVideo\Simulator-New\new-version\.gitignore`
- `c:\Users\alex\Documents\KernelVideo\Simulator-New\new-version\README.md`
- `c:\Users\alex\Documents\KernelVideo\Simulator-New\new-version\docs\RUNBOOK.md`
