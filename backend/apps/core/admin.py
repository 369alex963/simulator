from django.contrib import admin
from .models import AppConfig


@admin.register(AppConfig)
class AppConfigAdmin(admin.ModelAdmin):
    list_display = ["maintenance_mode", "exam_global_paused", "moodle_base_url", "updated_at"]

    def has_add_permission(self, request):
        return not AppConfig.objects.exists()

    def has_delete_permission(self, request, obj=None):
        return False
