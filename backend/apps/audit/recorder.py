"""
Helpers to write AuditLog and SecurityLog entries.
Called by signals and views — never raises.
"""
from __future__ import annotations

import json
import logging

logger = logging.getLogger(__name__)


def _get_ip(request) -> str | None:
    if request is None:
        return None
    xff = request.META.get("HTTP_X_FORWARDED_FOR", "")
    if xff:
        return xff.split(",")[0].strip() or None
    return request.META.get("REMOTE_ADDR") or None


def _get_ua(request) -> str:
    if request is None:
        return ""
    return request.META.get("HTTP_USER_AGENT", "")[:512]


def _get_session(request) -> str:
    if request is None:
        return ""
    try:
        return request.session.session_key or ""
    except Exception:
        return ""


def _get_actor(request):
    if request is None:
        return None, ""
    user = getattr(request, "user", None)
    if user and user.is_authenticated:
        return user, user.username
    return None, ""


def log_action(
    *,
    action: str,
    instance,
    changes: dict | None = None,
    request=None,
):
    """Write one AuditLog row. Safe to call from signals."""
    try:
        from .models import AuditLog
        from .middleware import get_current_request

        req = request or get_current_request()
        actor, actor_username = _get_actor(req)

        AuditLog.objects.create(
            actor=actor,
            actor_username=actor_username,
            action=action,
            model_name=instance.__class__.__name__,
            object_id=str(instance.pk),
            object_repr=str(instance)[:255],
            changes=changes or {},
            ip_address=_get_ip(req),
            user_agent=_get_ua(req),
            session_key=_get_session(req),
        )
    except Exception:
        logger.exception("Failed to write AuditLog")


def log_security(
    *,
    event_type: str,
    severity: str = "info",
    actor=None,
    actor_username: str = "",
    ip_address: str | None = None,
    user_agent: str = "",
    country_code: str = "",
    details: dict | None = None,
    request=None,
):
    """Write one SecurityLog row. Safe to call from anywhere."""
    try:
        from .models import SecurityLog
        from .middleware import get_current_request

        req = request or get_current_request()
        if actor is None and req:
            user = getattr(req, "user", None)
            if user and user.is_authenticated:
                actor = user
                actor_username = actor_username or user.username

        SecurityLog.objects.create(
            event_type=event_type,
            severity=severity,
            actor=actor,
            actor_username=actor_username,
            ip_address=ip_address or _get_ip(req),
            user_agent=user_agent or _get_ua(req),
            country_code=country_code,
            details=details or {},
        )
    except Exception:
        logger.exception("Failed to write SecurityLog")
