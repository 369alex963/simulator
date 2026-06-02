"""KERNELiOS — root URL configuration."""
from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

from apps.accounts.user_management_views import user_list, user_detail, admin_reset_password, login_audit_list
from apps.core.settings_views import app_config, toggle_maintenance, toggle_global_pause, test_email

urlpatterns = [
    path("admin/", admin.site.urls),
    # Core
    path("api/", include("apps.core.urls")),
    path("api/settings/", app_config, name="settings"),
    path("api/settings/maintenance/", toggle_maintenance, name="toggle-maintenance"),
    path("api/settings/pause/", toggle_global_pause, name="toggle-pause"),
    path("api/settings/test-email/", test_email, name="test-email"),
    # Auth & users
    path("api/auth/", include("apps.accounts.urls")),
    path("api/users/", user_list, name="user-list"),
    path("api/users/<int:pk>/", user_detail, name="user-detail"),
    path("api/users/<int:pk>/reset-password/", admin_reset_password, name="user-reset-password"),
    path("api/audit-log/", login_audit_list, name="audit-log"),
    # Branches & branding
    path("api/branches/", include("apps.branches.urls")),
    path("api/brand/", include("apps.branding.urls")),
    # Content
    path("api/scenarios/", include("apps.scenarios.urls")),
    path("api/instances/", include("apps.instances.urls")),
    # Exam
    path("api/exam/", include("apps.enrollments.urls")),
    # Analytics & exports
    path("api/analytics/", include("apps.analytics.urls")),
    path("api/exports/", include("apps.exports.urls")),
    # Moodle
    path("api/moodle/", include("apps.moodle.urls")),
    # Notifications & SSE
    path("api/notifications/", include("apps.notifications.urls")),
    # Audit & Security logs
    path("api/audit/", include("apps.audit.urls")),
]

# Serve uploaded media only in DEBUG. In production, nginx (Cloudways) is
# configured to serve MEDIA_ROOT directly — far faster and avoids running
# untrusted file types through the Django stack.
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
