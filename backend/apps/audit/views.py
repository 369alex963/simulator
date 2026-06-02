"""Audit log + Security log API endpoints (admin-only)."""
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from apps.accounts.permissions import IsAdminLevel
from .models import AuditLog, SecurityLog
from .serializers import AuditLogSerializer, SecurityLogSerializer


@api_view(["GET"])
@permission_classes([IsAdminLevel])
def audit_log_list(request):
    """
    GET /api/audit/logs/
    Query params: action, model, actor, object_id, limit (default 300)
    """
    qs = AuditLog.objects.select_related("actor").all()

    action = request.query_params.get("action")
    model = request.query_params.get("model")
    actor = request.query_params.get("actor")
    object_id = request.query_params.get("object_id")
    try:
        limit = max(1, min(int(request.query_params.get("limit", 300)), 1000))
    except (ValueError, TypeError):
        limit = 300

    if action:
        qs = qs.filter(action=action)
    if model:
        qs = qs.filter(model_name__icontains=model)
    if actor:
        qs = qs.filter(actor_username__icontains=actor)
    if object_id:
        qs = qs.filter(object_id=object_id)

    return Response(AuditLogSerializer(qs[:limit], many=True).data)


@api_view(["GET"])
@permission_classes([IsAdminLevel])
def security_log_list(request):
    """
    GET /api/audit/security/
    Query params: event_type, severity, actor, ip, limit (default 300)
    """
    qs = SecurityLog.objects.all()

    event_type = request.query_params.get("event_type")
    severity = request.query_params.get("severity")
    actor = request.query_params.get("actor")
    ip = request.query_params.get("ip")
    try:
        limit = max(1, min(int(request.query_params.get("limit", 300)), 1000))
    except (ValueError, TypeError):
        limit = 300

    if event_type:
        qs = qs.filter(event_type=event_type)
    if severity:
        qs = qs.filter(severity=severity)
    if actor:
        qs = qs.filter(actor_username__icontains=actor)
    if ip:
        qs = qs.filter(ip_address__icontains=ip)

    return Response(SecurityLogSerializer(qs[:limit], many=True).data)
