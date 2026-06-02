"""
Geo-IP country detection.
Priority:
  1. CF-IPCountry header (Cloudways/Cloudflare in prod)
  2. X-Forwarded-For + MaxMind GeoLite2 (local dev — mmdb at backend/data/)
  3. 30-day country cookie set on login
  4. Empty string (graceful fallback)

GeoLite2-Country.mmdb is bundled at backend/data/GeoLite2-Country.mmdb.
"""
from __future__ import annotations

from pathlib import Path

MMDB_PATH = Path(__file__).resolve().parent.parent.parent / "data" / "GeoLite2-Country.mmdb"

_reader = None
_reader_loaded = False


def _get_reader():
    global _reader, _reader_loaded
    if _reader_loaded:
        return _reader
    _reader_loaded = True
    if not MMDB_PATH.exists():
        return None
    try:
        import geoip2.database  # type: ignore
        _reader = geoip2.database.Reader(str(MMDB_PATH))
    except Exception:
        _reader = None
    return _reader


def get_country_from_request(request) -> str:
    """Return ISO 3166-1 alpha-2 country code, or empty string."""
    # Cloudflare / Cloudways header
    cf = request.META.get("HTTP_CF_IPCOUNTRY", "")
    if cf and cf != "XX":
        return cf.upper()[:2]

    # Derive client IP
    xff = request.META.get("HTTP_X_FORWARDED_FOR", "")
    ip = xff.split(",")[0].strip() if xff else request.META.get("REMOTE_ADDR", "")

    if not ip or ip in ("127.0.0.1", "::1", ""):
        return ""

    reader = _get_reader()
    if reader is None:
        return ""

    try:
        response = reader.country(ip)
        return response.country.iso_code or ""
    except Exception:
        return ""
