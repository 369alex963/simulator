# KERNELiOS — Advanced Simulator System v2

Cyber-themed, multi-branch, multi-role exam & simulation platform.

## Quick Start (Windows)

```
double-click  run.bat
```

- **Backend** → http://localhost:8000  
- **Frontend** → http://localhost:3000  
- **API health** → http://localhost:8000/api/health/

On first run `run.bat` creates a Python venv, installs all deps, applies migrations, and installs npm packages automatically.

## Stack

| Layer | Tech |
|---|---|
| Backend | Django 5 + DRF |
| Frontend | Next.js 16 + Tailwind v4 + shadcn/ui |
| DB (local) | SQLite |
| DB (prod) | PostgreSQL (Cloudways) |
| Cache | Redis (optional local, required prod) |
| Realtime | Server-Sent Events |
| Exports | CSV + XLSX + PDF |

## Roles

`admin` → `admin_user` → `branch_manager` → `teacher` → `student`

See `docs/ROLES.md` for the full permission matrix.

## Brand-kit

Every page is white-labelled. Brand-kit resolution order:  
user's branch kit → IP-country kit → 30-day cookie → default (gold/dark cyber).

See `docs/BRAND-KIT.md` for how to create and attach brand-kits.

## Deployment (Cloudways)

See `docs/RUNBOOK.md` for step-by-step Cloudways deployment instructions.
