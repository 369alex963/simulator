"""Maintenance mode middleware."""
from django.http import JsonResponse
from django.urls import reverse


class MaintenanceModeMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        from .models import AppConfig
        cfg = AppConfig.get()

        if cfg.maintenance_mode:
            # Allow admin login and static
            bypass = [
                "/api/auth/login/",
                "/api/health/",
                "/static/",
                "/media/",
                "/admin/",
            ]
            is_bypassed = any(request.path.startswith(p) for p in bypass)
            is_admin = request.user.is_authenticated and request.user.role in ("admin", "admin_user")

            if not is_bypassed and not is_admin:
                return JsonResponse(
                    {
                        "maintenance": True,
                        "message": cfg.maintenance_message,
                    },
                    status=503,
                )

        return self.get_response(request)
