"""KERNELiOS — Django settings.

Single file. Switches behaviour on DJANGO_DEBUG=False for Cloudways production.
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

from dotenv import load_dotenv

# ----------------------------------------------------------------------
# Paths & env
# ----------------------------------------------------------------------
BASE_DIR = Path(__file__).resolve().parent.parent  # = backend/
load_dotenv(BASE_DIR / ".env")


def _env_bool(key: str, default: bool = False) -> bool:
    return os.getenv(key, str(default)).lower() in {"1", "true", "yes", "on"}


def _env_list(key: str, default: str = "") -> list[str]:
    raw = os.getenv(key, default)
    return [item.strip() for item in raw.split(",") if item.strip()]


# Production-safe default: DEBUG must be explicitly opted into.
DEBUG = _env_bool("DJANGO_DEBUG", default=False)

_secret_key_fallback = "dev-only-insecure-change-me-1q2w3e4r5t6y7u8i9o0p"
SECRET_KEY = os.getenv("DJANGO_SECRET_KEY", _secret_key_fallback)
if not DEBUG and SECRET_KEY == _secret_key_fallback:
    from django.core.exceptions import ImproperlyConfigured
    raise ImproperlyConfigured(
        "DJANGO_SECRET_KEY must be set to a unique secret in production. "
        "Generate one with: python -c \"import secrets; print(secrets.token_urlsafe(50))\""
    )

_allowed_hosts_raw = _env_list(
    "DJANGO_ALLOWED_HOSTS",
    default="localhost,127.0.0.1,0.0.0.0",
)
ALLOWED_HOSTS: list[str] = ["*"] if DEBUG else _allowed_hosts_raw

# ----------------------------------------------------------------------
# Apps
# ----------------------------------------------------------------------
INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "corsheaders",
    # KERNELiOS apps
    "apps.core",
    "apps.branches",
    "apps.accounts",
    "apps.branding",
    "apps.scenarios",
    "apps.instances",
    "apps.enrollments",
    "apps.analytics",
    "apps.exports",
    "apps.moodle",
    "apps.notifications",
    "apps.support",
    "apps.audit",
]

AUTH_USER_MODEL = "accounts.User"

# WhiteNoise serves Django static files directly from gunicorn in production.
# Must sit immediately after SecurityMiddleware.
MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "apps.core.middleware.MaintenanceModeMiddleware",
    "apps.audit.middleware.AuditMiddleware",
]

ROOT_URLCONF = "kernelios.urls"
WSGI_APPLICATION = "kernelios.wsgi.application"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

# ----------------------------------------------------------------------
# DB — SQLite in dev (default). PostgreSQL in prod via DB_* env vars.
# ----------------------------------------------------------------------
_db_engine = os.getenv("DB_ENGINE", "django.db.backends.sqlite3")
if _db_engine == "django.db.backends.sqlite3":
    DATABASES = {
        "default": {
            "ENGINE": _db_engine,
            "NAME": os.getenv("DB_NAME", str(BASE_DIR / "db.sqlite3")),
        }
    }
else:
    DATABASES = {
        "default": {
            "ENGINE": _db_engine,
            "NAME": os.getenv("DB_NAME", "kernelios"),
            "USER": os.getenv("DB_USER", ""),
            "PASSWORD": os.getenv("DB_PASSWORD", ""),
            "HOST": os.getenv("DB_HOST", "localhost"),
            "PORT": os.getenv("DB_PORT", "5432"),
            "CONN_MAX_AGE": int(os.getenv("DB_CONN_MAX_AGE", "60")),
            "OPTIONS": {"sslmode": os.getenv("DB_SSLMODE", "prefer")},
        }
    }

# ----------------------------------------------------------------------
# Auth
# ----------------------------------------------------------------------
AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
        "OPTIONS": {"min_length": 6},
    },
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]
PASSWORD_HASHERS = [
    "django.contrib.auth.hashers.Argon2PasswordHasher",
    "django.contrib.auth.hashers.PBKDF2PasswordHasher",
]

# 24-hour session cookie per spec.
SESSION_COOKIE_AGE = 60 * 60 * 24
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = "Lax"
SESSION_COOKIE_SECURE = not DEBUG
CSRF_COOKIE_HTTPONLY = False  # Frontend reads it for X-CSRFToken header
CSRF_COOKIE_SAMESITE = "Lax"
CSRF_COOKIE_SECURE = not DEBUG

# ----------------------------------------------------------------------
# Security headers (HTTPS / proxy-aware, behind nginx on Cloudways)
# ----------------------------------------------------------------------
if not DEBUG:
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
    SECURE_SSL_REDIRECT = _env_bool("DJANGO_SSL_REDIRECT", default=True)
    SECURE_HSTS_SECONDS = int(os.getenv("DJANGO_HSTS_SECONDS", "31536000"))  # 1 year
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY = "same-origin"
# Trust X-Forwarded-Host so Django builds absolute media URLs with the public domain
USE_X_FORWARDED_HOST = True
X_FRAME_OPTIONS = "DENY"

# ----------------------------------------------------------------------
# i18n / tz
# ----------------------------------------------------------------------
LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

# ----------------------------------------------------------------------
# Static / media
# ----------------------------------------------------------------------
STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

# WhiteNoise: compressed + far-future-cache static files via gunicorn.
STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {"BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage"},
}

# Max upload size for logos/fonts (defends against DoS via giant uploads).
DATA_UPLOAD_MAX_MEMORY_SIZE = int(os.getenv("DJANGO_DATA_UPLOAD_MAX", str(5 * 1024 * 1024)))   # 5 MiB
FILE_UPLOAD_MAX_MEMORY_SIZE = int(os.getenv("DJANGO_FILE_UPLOAD_MAX", str(5 * 1024 * 1024)))   # 5 MiB

# ----------------------------------------------------------------------
# Cache — Redis when REDIS_URL is set; local-memory fallback for dev.
# ----------------------------------------------------------------------
_redis_url = os.getenv("REDIS_URL", "")
if _redis_url:
    CACHES = {
        "default": {
            "BACKEND": "django_redis.cache.RedisCache",
            "LOCATION": _redis_url,
            "OPTIONS": {
                "CLIENT_CLASS": "django_redis.client.DefaultClient",
                "IGNORE_EXCEPTIONS": True,  # degrade gracefully if Redis goes down
            },
            "TIMEOUT": 300,
        }
    }
else:
    CACHES = {
        "default": {
            "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
        }
    }

# ----------------------------------------------------------------------
# DRF
# ----------------------------------------------------------------------
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        # CsrfExemptSessionAuthentication skips CSRF on JSON API endpoints.
        # Same-origin enforcement is via CORS allowlist + SameSite=Lax cookies.
        "apps.accounts.authentication.CsrfExemptSessionAuthentication",
    ],
    "DEFAULT_RENDERER_CLASSES": [
        "rest_framework.renderers.JSONRenderer",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        # Safe default — every view must explicitly opt out to AllowAny.
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
    ],
    "EXCEPTION_HANDLER": "apps.audit.exception_handler.audit_exception_handler",
    "DEFAULT_THROTTLE_RATES": {
        "login": "10/min",
        "password_reset": "5/min",
        "register": "5/min",
        "anon": "120/min",
        "user": "1000/min",
    },
}

# ----------------------------------------------------------------------
# CORS
# ----------------------------------------------------------------------
CORS_ALLOW_CREDENTIALS = True
if DEBUG:
    CORS_ALLOW_ALL_ORIGINS = True
else:
    CORS_ALLOWED_ORIGINS = _env_list(
        "DJANGO_CORS_ORIGINS",
        default="http://localhost:3000,http://127.0.0.1:3000",
    )

CSRF_TRUSTED_ORIGINS = _env_list(
    "DJANGO_CORS_ORIGINS",
    default="http://localhost:3000,http://127.0.0.1:3000,http://10.5.0.2:3000",
)

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# API is consumed by the Next.js proxy — don't redirect /path to /path/
APPEND_SLASH = False

# ----------------------------------------------------------------------
# Email — console in DEBUG, real SMTP via env in prod (DB-stored SMTP
# config in AppConfig may override this at runtime; this is the boot default).
# ----------------------------------------------------------------------
if DEBUG:
    EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"
else:
    EMAIL_BACKEND = os.getenv("DJANGO_EMAIL_BACKEND", "django.core.mail.backends.smtp.EmailBackend")
    EMAIL_HOST = os.getenv("EMAIL_HOST", "")
    EMAIL_PORT = int(os.getenv("EMAIL_PORT", "587"))
    EMAIL_HOST_USER = os.getenv("EMAIL_HOST_USER", "")
    EMAIL_HOST_PASSWORD = os.getenv("EMAIL_HOST_PASSWORD", "")
    EMAIL_USE_TLS = _env_bool("EMAIL_USE_TLS", default=True)
    DEFAULT_FROM_EMAIL = os.getenv("DEFAULT_FROM_EMAIL", "noreply@kernelio.com")

# ----------------------------------------------------------------------
# Logging — rotating file + stdout. Sensitive fields redacted by audit layer.
# ----------------------------------------------------------------------
LOG_DIR = BASE_DIR / "logs"
LOG_DIR.mkdir(exist_ok=True)

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "verbose": {"format": "[{asctime}] {levelname} {name}: {message}", "style": "{"},
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "verbose",
            "stream": sys.stdout,
        },
        "file": {
            "class": "logging.handlers.RotatingFileHandler",
            "filename": str(LOG_DIR / "kernelios.log"),
            "maxBytes": 10 * 1024 * 1024,
            "backupCount": 5,
            "formatter": "verbose",
        },
        "security_file": {
            "class": "logging.handlers.RotatingFileHandler",
            "filename": str(LOG_DIR / "security.log"),
            "maxBytes": 10 * 1024 * 1024,
            "backupCount": 10,
            "formatter": "verbose",
        },
    },
    "root": {
        "level": "INFO" if not DEBUG else "DEBUG",
        "handlers": ["console", "file"],
    },
    "loggers": {
        "django.security": {"level": "INFO", "handlers": ["console", "security_file"], "propagate": False},
        "apps.accounts": {"level": "INFO", "handlers": ["console", "security_file"], "propagate": False},
        "apps.audit": {"level": "INFO", "handlers": ["console", "security_file"], "propagate": False},
    },
}
