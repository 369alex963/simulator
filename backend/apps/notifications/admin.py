from django.contrib import admin
from .models import Announcement, EmailTemplate, HelpRequest


@admin.register(Announcement)
class AnnouncementAdmin(admin.ModelAdmin):
    list_display = ["title", "scope", "severity", "is_active", "created_at", "expires_at"]
    list_filter = ["scope", "severity", "is_active"]


@admin.register(EmailTemplate)
class EmailTemplateAdmin(admin.ModelAdmin):
    list_display = ["key", "subject", "brand_aware", "is_active"]
    list_filter = ["brand_aware", "is_active"]


@admin.register(HelpRequest)
class HelpRequestAdmin(admin.ModelAdmin):
    list_display = ["enrollment", "question", "created_at", "resolved_at"]
    list_filter = ["resolved_at"]
    readonly_fields = ["created_at"]
