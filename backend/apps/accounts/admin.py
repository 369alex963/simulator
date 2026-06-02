from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import LoginAuditLog, User


@admin.register(User)
class KernelUserAdmin(UserAdmin):
    list_display = ["username", "email", "role", "branch", "is_active", "is_super_admin"]
    list_filter = ["role", "branch", "is_active"]
    fieldsets = UserAdmin.fieldsets + (
        ("KERNELiOS", {"fields": ("role", "branch", "must_change_password", "created_via", "moodle_user_id", "is_super_admin")}),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        ("KERNELiOS", {"fields": ("role", "branch")}),
    )


@admin.register(LoginAuditLog)
class LoginAuditLogAdmin(admin.ModelAdmin):
    list_display = ["username_attempted", "success", "ip_address", "country_code", "created_at"]
    list_filter = ["success", "country_code"]
    readonly_fields = ["username_attempted", "user", "ip_address", "country_code", "user_agent", "success", "created_at"]
