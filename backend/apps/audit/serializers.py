from rest_framework import serializers
from .models import AuditLog, SecurityLog


class AuditLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = AuditLog
        fields = [
            "id", "action", "model_name", "object_id", "object_repr",
            "changes", "actor_username", "ip_address", "user_agent",
            "session_key", "created_at",
        ]


class SecurityLogSerializer(serializers.ModelSerializer):
    event_type_display = serializers.CharField(source="get_event_type_display", read_only=True)
    severity_display = serializers.CharField(source="get_severity_display", read_only=True)

    class Meta:
        model = SecurityLog
        fields = [
            "id", "event_type", "event_type_display", "severity", "severity_display",
            "actor_username", "ip_address", "user_agent", "country_code",
            "details", "created_at",
        ]
