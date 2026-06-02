"""
Audit + Security log models.

AuditLog  — tracks CREATE / UPDATE / DELETE on every tracked model,
            recording the actor, IP, user-agent, and field-level diffs.

SecurityLog — records security-relevant events: failed logins, permission
              denials, rate-limit hits, suspicious requests.
"""
from django.db import models


class AuditLog(models.Model):
    ACTION_CREATE = "create"
    ACTION_UPDATE = "update"
    ACTION_DELETE = "delete"
    ACTION_CHOICES = [
        (ACTION_CREATE, "Create"),
        (ACTION_UPDATE, "Update"),
        (ACTION_DELETE, "Delete"),
    ]

    actor = models.ForeignKey(
        "accounts.User",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="audit_entries",
    )
    actor_username = models.CharField(max_length=150, blank=True, default="")
    action = models.CharField(max_length=10, choices=ACTION_CHOICES, db_index=True)
    model_name = models.CharField(max_length=100, db_index=True)
    object_id = models.CharField(max_length=64, db_index=True)
    object_repr = models.CharField(max_length=255, blank=True, default="")
    # JSON: {"field": {"old": ..., "new": ...}, ...}
    changes = models.JSONField(default=dict, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=512, blank=True, default="")
    session_key = models.CharField(max_length=40, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "audit log"

    def __str__(self) -> str:
        return f"{self.actor_username} {self.action} {self.model_name}#{self.object_id}"


class SecurityLog(models.Model):
    SEVERITY_INFO = "info"
    SEVERITY_WARN = "warn"
    SEVERITY_CRITICAL = "critical"
    SEVERITY_CHOICES = [
        (SEVERITY_INFO, "Info"),
        (SEVERITY_WARN, "Warning"),
        (SEVERITY_CRITICAL, "Critical"),
    ]

    EVENT_LOGIN_FAIL = "login_fail"
    EVENT_LOGIN_OK = "login_ok"
    EVENT_LOGOUT = "logout"
    EVENT_PERMISSION_DENIED = "permission_denied"
    EVENT_PASSWORD_RESET = "password_reset"
    EVENT_PASSWORD_CHANGE = "password_change"
    EVENT_ACCOUNT_LOCKED = "account_locked"
    EVENT_SUSPICIOUS_REQUEST = "suspicious_request"
    EVENT_RATE_LIMIT = "rate_limit"
    EVENT_SUPER_ADMIN_ACTION = "super_admin_action"
    EVENT_CHOICES = [
        (EVENT_LOGIN_FAIL, "Login Failed"),
        (EVENT_LOGIN_OK, "Login Succeeded"),
        (EVENT_LOGOUT, "Logout"),
        (EVENT_PERMISSION_DENIED, "Permission Denied"),
        (EVENT_PASSWORD_RESET, "Password Reset"),
        (EVENT_PASSWORD_CHANGE, "Password Changed"),
        (EVENT_ACCOUNT_LOCKED, "Account Locked"),
        (EVENT_SUSPICIOUS_REQUEST, "Suspicious Request"),
        (EVENT_RATE_LIMIT, "Rate Limit Hit"),
        (EVENT_SUPER_ADMIN_ACTION, "Super-Admin Action"),
    ]

    event_type = models.CharField(max_length=30, choices=EVENT_CHOICES, db_index=True)
    severity = models.CharField(max_length=10, choices=SEVERITY_CHOICES, default=SEVERITY_INFO, db_index=True)
    actor = models.ForeignKey(
        "accounts.User",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="security_entries",
    )
    actor_username = models.CharField(max_length=150, blank=True, default="")
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=512, blank=True, default="")
    country_code = models.CharField(max_length=2, blank=True, default="")
    # Free-form detail dict
    details = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "security log"

    def __str__(self) -> str:
        return f"{self.event_type} | {self.actor_username} | {self.ip_address}"
