# Production-Ready Hardening — KERNELiOS

Target: deploy to Cloudways via GitHub. STOP before `git push`.

## Phase A — Discovery (parallel audits, read-only)

- [ ] A1. Backend security audit (Django/DRF): OWASP Top 10, secrets, injection, auth flow, sessions, CSRF, file upload safety
- [ ] A2. Frontend security audit (Next.js): XSS, `dangerouslySetInnerHTML`, auth flow, secret leakage, unsafe deps
- [ ] A3. RBAC verification: every endpoint enforces correct permission class
- [ ] A4. Bug hunt: runtime/logic bugs, dead code, missing boundary error handling, race conditions
- [ ] A5. Production-readiness audit: DEBUG=False path, ALLOWED_HOSTS, SECRET_KEY, secure cookies, HSTS, static, DB, logs

## Phase B — Synthesis

- [ ] B1. Consolidate findings into a severity-ranked fix list

## Phase C — Fixes (Critical → High → Medium → Low)

- [ ] C1. CRITICAL security
- [ ] C2. HIGH security + HIGH bugs
- [ ] C3. MEDIUM
- [ ] C4. LOW (worth fixing)

## Phase D — Production infrastructure

- [ ] D1. Django settings hardening (SECRET_KEY required, DEBUG, ALLOWED_HOSTS, SECURE_* flags, HSTS, cookies, X-Frame, referrer, content-type nosniff, SSL proxy header)
- [ ] D2. CSRF_TRUSTED_ORIGINS + CORS_ALLOWED_ORIGINS via env (no wildcard)
- [ ] D3. PostgreSQL via env vars
- [ ] D4. WhiteNoise static; collectstatic deploy step; STATIC_ROOT set
- [ ] D5. Media: dev-only auto-serve; prod via nginx (Cloudways)
- [ ] D6. Rate limiting on auth endpoints (DRF throttling)
- [ ] D7. Logging configuration (rotating file + stdout)
- [ ] D8. Frontend: NEXT_PUBLIC_API_URL prod config, no leaked secrets
- [ ] D9. requirements.txt pinned + gunicorn + whitenoise + psycopg
- [ ] D10. .gitignore at repo root
- [ ] D11. .env.example complete (backend + frontend)
- [ ] D12. DEPLOYMENT.md (Cloudways steps)
- [ ] D13. `manage.py check --deploy` passes (or documented exceptions)
- [ ] D14. seed_admin: no known default password baked into prod

## Phase E — Verify

- [ ] E1. `npx tsc --noEmit` clean
- [ ] E2. `npx next lint` clean
- [ ] E3. Frontend `next build` succeeds
- [ ] E4. `python manage.py check` (DEBUG=False)
- [ ] E5. `python manage.py check --deploy`
- [ ] E6. Migrations up-to-date
- [ ] E7. Smoke test: /api/health/, /api/brand/resolve/, login

## Phase F — Stop

- [ ] F1. Full summary, hand off to user before any `git push`
