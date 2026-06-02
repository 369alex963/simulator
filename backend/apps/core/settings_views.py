"""Settings + Maintenance + AppConfig API."""
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework import serializers

from apps.accounts.permissions import IsAdminLevel
from .models import AppConfig


class AppConfigSerializer(serializers.ModelSerializer):
    # Boolean indicators so the frontend can show "configured" placeholders
    # without ever receiving the actual secret value.
    moodle_token_set = serializers.SerializerMethodField()
    smtp_password_set = serializers.SerializerMethodField()

    class Meta:
        model = AppConfig
        fields = [
            "maintenance_mode", "maintenance_message", "exam_global_paused",
            "moodle_base_url", "moodle_token", "moodle_token_set",
            "smtp_host", "smtp_port", "smtp_user", "smtp_password", "smtp_password_set",
            "smtp_from_email", "smtp_use_tls",
            "updated_at",
        ]
        read_only_fields = ["updated_at", "moodle_token_set", "smtp_password_set"]
        extra_kwargs = {
            "moodle_token": {"write_only": True},
            "smtp_password": {"write_only": True},
        }

    def get_moodle_token_set(self, obj) -> bool:
        return bool(obj.moodle_token)

    def get_smtp_password_set(self, obj) -> bool:
        return bool(obj.smtp_password)


@api_view(["GET", "PATCH"])
@permission_classes([IsAdminLevel])
def app_config(request):
    cfg = AppConfig.get()

    if request.method == "GET":
        return Response(AppConfigSerializer(cfg).data)

    serializer = AppConfigSerializer(cfg, data=request.data, partial=True)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(AppConfigSerializer(cfg).data)


@api_view(["POST"])
@permission_classes([IsAdminLevel])
def toggle_maintenance(request):
    cfg = AppConfig.get()
    cfg.maintenance_mode = not cfg.maintenance_mode
    msg = request.data.get("message")
    if msg:
        cfg.maintenance_message = msg
    cfg.save()
    return Response({
        "maintenance_mode": cfg.maintenance_mode,
        "message": cfg.maintenance_message,
    })


@api_view(["POST"])
@permission_classes([IsAdminLevel])
def toggle_global_pause(request):
    cfg = AppConfig.get()
    cfg.exam_global_paused = not cfg.exam_global_paused
    cfg.save()
    return Response({"exam_global_paused": cfg.exam_global_paused})


@api_view(["POST"])
@permission_classes([IsAdminLevel])
def test_email(request):
    """Send a test email to the requesting user to verify SMTP configuration."""
    from apps.notifications.email_service import send_email
    to = request.data.get("to") or request.user.email
    if not to:
        return Response({"detail": "No recipient email. Set your account email first."}, status=400)

    html = """
<h2 style="color:#ffd700;font-family:monospace">TEST EMAIL</h2>
<p style="font-family:monospace">SMTP configuration is working correctly.</p>
<p style="color:#a1a1aa;font-family:monospace;font-size:12px">Sent from KERNELiOS Settings panel.</p>
"""
    success, message = send_email(to, "KERNELiOS — SMTP Test", html)
    status_code = 200 if success else 502
    return Response({"success": success, "detail": message}, status=status_code)
