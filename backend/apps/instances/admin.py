from django.contrib import admin
from .models import Instance


@admin.register(Instance)
class InstanceAdmin(admin.ModelAdmin):
    list_display = ["name", "status", "branch", "scenario", "registration_open", "enrollment_count", "created_at"]
    list_filter = ["status", "branch", "registration_open"]
    readonly_fields = ["created_at", "updated_at", "archived_at", "exported_at"]

    def enrollment_count(self, obj):
        return obj.enrollments.count()
    enrollment_count.short_description = "Students"
