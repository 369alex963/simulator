# Cloudways Deployment Runbook

> Phase 12 will expand this. Placeholder for now.

## Pre-requisites

- Cloudways managed app server (Python 3.10+)
- Postgres add-on enabled
- Redis add-on enabled (optional but recommended)

## Environment variables to set on Cloudways

```
DJANGO_SECRET_KEY=<long random string>
DJANGO_DEBUG=false
DJANGO_ALLOWED_HOSTS=<your-cloudways-domain>
DB_ENGINE=django.db.backends.postgresql
DB_NAME=<your db>
DB_USER=<your user>
DB_PASSWORD=<your password>
DB_HOST=<cloudways internal host>
DB_PORT=5432
REDIS_URL=redis://<cloudways redis host>:6379/0
DJANGO_CORS_ORIGINS=https://<your-frontend-domain>
```

## Deploy steps

1. Push backend/ to Cloudways Git remote
2. SSH into server: `pip install -r requirements.txt`
3. `python manage.py migrate`
4. `python manage.py collectstatic --noinput`
5. Restart application server

## Frontend

Deploy `frontend/` to Vercel or any Node host. Set `NEXT_PUBLIC_API_URL` to your Cloudways backend URL.
