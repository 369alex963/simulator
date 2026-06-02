"""Announcements, EmailTemplates, HelpRequests."""
from django.db import models


class AnnouncementScope(models.TextChoices):
    GLOBAL = "global", "Global"
    BRANCH = "branch", "Branch"
    INSTANCE = "instance", "Instance"


class AnnouncementSeverity(models.TextChoices):
    INFO = "info", "Info"
    WARN = "warn", "Warning"
    URGENT = "urgent", "Urgent"


class Announcement(models.Model):
    scope = models.CharField(
        max_length=10,
        choices=AnnouncementScope.choices,
        default=AnnouncementScope.GLOBAL,
        db_index=True,
    )
    branch = models.ForeignKey(
        "branches.Branch",
        null=True, blank=True,
        on_delete=models.CASCADE,
        related_name="announcements",
    )
    instance = models.ForeignKey(
        "instances.Instance",
        null=True, blank=True,
        on_delete=models.CASCADE,
        related_name="announcements",
    )
    title = models.CharField(max_length=200)
    message = models.TextField()
    severity = models.CharField(
        max_length=6,
        choices=AnnouncementSeverity.choices,
        default=AnnouncementSeverity.INFO,
    )
    is_active = models.BooleanField(default=True, db_index=True)
    created_by = models.ForeignKey(
        "accounts.User",
        null=True,
        on_delete=models.SET_NULL,
        related_name="announcements",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"[{self.scope}] {self.title}"


class EmailTemplate(models.Model):
    KEY_CHOICES = [
        ("welcome", "Welcome"),
        ("moodle_imported", "Moodle Import Welcome"),
        ("password_reset", "Password Reset"),
        ("instance_created", "Instance Created"),
        ("instance_results", "Instance Results"),
        ("exam_start", "Exam Started"),
        ("exam_complete", "Exam Completed"),
        ("registration_open", "Registration Open"),
        ("reminder", "Exam Reminder"),
        ("custom", "Custom"),
    ]
    key = models.CharField(max_length=30, choices=KEY_CHOICES, unique=True)
    subject = models.CharField(max_length=255)
    html_body = models.TextField()
    text_body = models.TextField(blank=True)
    brand_aware = models.BooleanField(default=True)
    is_active = models.BooleanField(default=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        return self.key


class HelpRequest(models.Model):
    enrollment = models.ForeignKey(
        "enrollments.Enrollment",
        on_delete=models.CASCADE,
        related_name="help_requests",
    )
    question = models.ForeignKey(
        "scenarios.Question",
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name="help_requests",
    )
    message = models.CharField(max_length=500)
    created_at = models.DateTimeField(auto_now_add=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"Help from {self.enrollment.user.username}"
