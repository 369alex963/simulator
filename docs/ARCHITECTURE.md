# Architecture

```
new-version/
├── backend/          Django 5 + DRF — serves /api/* on :8000
│   ├── apps/
│   │   ├── core/         health, base permissions, utilities
│   │   ├── accounts/     User (custom), auth, LoginAuditLog
│   │   ├── branches/     Branch, HQ seed
│   │   ├── branding/     BrandKit, GeoIP resolver
│   │   ├── scenarios/    Scenario, Question, ScoringRules
│   │   ├── instances/    Instance, status machine
│   │   ├── enrollments/  Enrollment, QuestionAttempt, scoring engine
│   │   ├── analytics/    per-role analytics endpoints
│   │   ├── exports/      CSV / XLSX / PDF generators
│   │   ├── moodle/       REST client, importer, grade push
│   │   ├── notifications/ Announcement, EmailTemplate, SSE
│   │   └── support/      HelpRequest
│   └── kernelios/    Django project (settings, urls, wsgi)
│
└── frontend/         Next.js 16 + Tailwind v4 — serves UI on :3000
    └── src/app/
        ├── (public)/ landing, login, register, forgot, maintenance
        ├── (student)/ exam, progress, scoreboard
        ├── (teacher)/ dashboard, instance, analytics, exports
        ├── (branch)/  user mgmt, instances, analytics, moodle import
        └── (admin)/   full admin suite
```

All brand-kit CSS variables live in `frontend/src/app/globals.css` under `:root`.
The `BrandKitProvider` fetches `/api/brand/resolve` and overwrites those variables,
cascading the brand-kit change to every component instantly.
