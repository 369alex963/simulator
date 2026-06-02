from django.contrib import admin
from .models import Enrollment, QuestionAttempt


class QuestionAttemptInline(admin.TabularInline):
    model = QuestionAttempt
    fields = ["question", "attempts", "is_correct", "score", "hint_used", "active_seconds"]
    readonly_fields = ["question", "attempts", "is_correct", "score", "hint_used", "active_seconds"]
    extra = 0


@admin.register(Enrollment)
class EnrollmentAdmin(admin.ModelAdmin):
    list_display = ["user", "instance", "status", "score_total", "started_at", "completed_at"]
    list_filter = ["status", "instance__branch"]
    readonly_fields = ["score_total", "started_at", "completed_at", "created_at"]
    inlines = [QuestionAttemptInline]


@admin.register(QuestionAttempt)
class QuestionAttemptAdmin(admin.ModelAdmin):
    list_display = ["enrollment", "question", "attempts", "is_correct", "score", "active_seconds"]
    list_filter = ["is_correct", "hint_used"]
    readonly_fields = ["score", "first_seen_at", "completed_at"]
