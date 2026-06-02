# KERNELiOS — Cloudways Deployment Guide

## Prerequisites
- Cloudways VPS with Python app (Ubuntu 22.04 recommended)
- PostgreSQL database created in Cloudways panel
- Redis server (optional; enables caching)
- Domain/subdomain pointed to server IP
- SSL certificate (Cloudways Let's Encrypt one-click)

## 1. Initial server setup
```bash
# SSH into server
ssh master@<server-ip> -p <port>
cd /var/www/<app-name>

# Clone repo
git clone <repo-url> .
cd new-version
```

## 2. Backend setup
```bash
cd backend

# Create virtualenv
python3 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install --upgrade pip
pip install -r requirements.txt

# Configure environment
cp .env.example .env
nano .env  # fill in all values (see .env.example comments)

# Provision database
python manage.py migrate
python manage.py collectstatic --noinput
python manage.py seed_admin      # creates admin user (change password immediately)
python manage.py seed_brand_kit  # creates default brand kit

# Test it works
python manage.py check --deploy
```

## 3. Frontend setup
```bash
cd ../frontend

# Install Node deps (use Node 20+)
npm ci --production=false

# Create env file
cp .env.local.example .env.local  # or create manually
# Set NEXT_PUBLIC_API_URL=https://<your-domain>

# Build
npm run build
```

## 4. Gunicorn supervisor config
Create `/etc/supervisor/conf.d/kernelios-backend.conf`:
```ini
[program:kernelios-backend]
command=/var/www/<app>/new-version/backend/.venv/bin/gunicorn kernelios.wsgi:application --workers 3 --bind 127.0.0.1:8000 --timeout 120 --access-logfile /var/www/<app>/new-version/backend/logs/gunicorn-access.log --error-logfile /var/www/<app>/new-version/backend/logs/gunicorn-error.log
directory=/var/www/<app>/new-version/backend
user=www-data
autostart=true
autorestart=true
environment=DJANGO_DEBUG="false",DJANGO_SECRET_KEY="<your-key>",DJANGO_ALLOWED_HOSTS="<your-domain>",DJANGO_CORS_ORIGINS="https://<your-domain>",DB_ENGINE="django.db.backends.postgresql",DB_NAME="<db>",DB_USER="<user>",DB_PASSWORD="<pass>",DB_HOST="<host>",DB_PORT="5432"
stderr_logfile=/var/log/supervisor/kernelios-backend.err.log
stdout_logfile=/var/log/supervisor/kernelios-backend.out.log
```

## 5. Next.js supervisor config
Create `/etc/supervisor/conf.d/kernelios-frontend.conf`:
```ini
[program:kernelios-frontend]
command=/usr/bin/node /var/www/<app>/new-version/frontend/node_modules/.bin/next start --hostname 127.0.0.1 --port 3001
directory=/var/www/<app>/new-version/frontend
user=www-data
autostart=true
autorestart=true
environment=NODE_ENV="production",NEXT_PUBLIC_API_URL="https://<your-domain>"
stderr_logfile=/var/log/supervisor/kernelios-frontend.err.log
stdout_logfile=/var/log/supervisor/kernelios-frontend.out.log
```

## 6. Nginx configuration
Add to nginx site config:
```nginx
server {
    listen 443 ssl;
    server_name <your-domain>;

    # SSL (managed by Cloudways Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/<your-domain>/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/<your-domain>/privkey.pem;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header Referrer-Policy same-origin;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;

    # Forward proto for Django SECURE_PROXY_SSL_HEADER
    proxy_set_header X-Forwarded-Proto https;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header Host $host;

    # Django API
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_read_timeout 120s;
    }

    # Django admin
    location /admin/ {
        proxy_pass http://127.0.0.1:8000;
    }

    # Django static files (WhiteNoise serves these from gunicorn — no nginx rule needed)
    # But if you prefer nginx to serve them:
    # location /static/ {
    #     alias /var/www/<app>/new-version/backend/staticfiles/;
    #     expires 1y;
    #     add_header Cache-Control "public, immutable";
    # }

    # Media files (brand-kit logos, favicons — served by nginx directly)
    location /media/ {
        alias /var/www/<app>/new-version/backend/media/;
        expires 7d;
        add_header Cache-Control "public";
    }

    # Next.js frontend (everything else)
    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_read_timeout 60s;
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name <your-domain>;
    return 301 https://$host$request_uri;
}
```

## 7. Start services
```bash
supervisorctl reread
supervisorctl update
supervisorctl start kernelios-backend
supervisorctl start kernelios-frontend
nginx -t && nginx -s reload
```

## 8. Post-deploy checklist
- [ ] Visit https://<domain>/api/health/ — should return `{"status":"ok"}`
- [ ] Log in as admin (credentials from seed_admin output) — CHANGE PASSWORD IMMEDIATELY
- [ ] Configure brand kit at /app/admin/brand-kits
- [ ] Configure SMTP at /app/admin/settings (for email notifications)
- [ ] Configure Moodle credentials at /app/admin/settings (if using Moodle integration)
- [ ] Upload GeoLite2 database to `backend/data/GeoLite2-Country.mmdb` (optional, for country-based brand-kit routing)

## 9. Updates (rolling deploy)
```bash
cd /var/www/<app>/new-version
git pull origin main
cd backend && source .venv/bin/activate && pip install -r requirements.txt && python manage.py migrate && python manage.py collectstatic --noinput
cd ../frontend && npm ci --production=false && npm run build
supervisorctl restart kernelios-backend kernelios-frontend
```

## 10. Environment variables reference
See `backend/.env.example` for all required variables and explanations.
