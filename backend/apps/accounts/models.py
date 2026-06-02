from django.contrib.auth.models import AbstractUser
from django.db import models


class Role(models.TextChoices):
    ADMIN = "admin", "Admin"
    ADMIN_USER = "admin_user", "Admin User"
    BRANCH_MANAGER = "branch_manager", "Branch Manager"
    TEACHER = "teacher", "Teacher"
    STUDENT = "student", "Student"


class User(AbstractUser):
    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.STUDENT,
        db_index=True,
    )
    # Nullable so the field can be set after Branch is created in migration.
    # In practice all non-HQ users must have a branch; enforced at the serializer level.
    branch = models.ForeignKey(
        "branches.Branch",
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="users",
    )
    # Moodle integration
    moodle_user_id = models.CharField(max_length=64, blank=True, default="")
    # Force password change on first login (Moodle-imported users)
    must_change_password = models.BooleanField(default=False)
    # How was this account created
    created_via = models.CharField(
        max_length=20,
        choices=[
            ("manual", "Manual (admin)"),
            ("self_register", "Self-registration"),
            ("moodle", "Moodle import"),
        ],
        default="manual",
    )
    # Singleton lock — only the bootstrap admin has this True
    is_super_admin = models.BooleanField(default=False)
    # Set true the first time the user dismisses the role-specific How-To
    # onboarding walkthrough. The walkthrough remains accessible from the menu.
    has_seen_onboarding = models.BooleanField(default=False)

    class Meta:
        ordering = ["username"]

    def __str__(self) -> str:
        return f"{self.username} [{self.role}]"

    @property
    def display_role(self) -> str:
        return Role(self.role).label

    @property
    def can_be_deleted(self) -> bool:
        return not self.is_super_admin

    @property
    def is_admin_level(self) -> bool:
        return self.role in {Role.ADMIN, Role.ADMIN_USER}

    @property
    def is_staff_level(self) -> bool:
        """True for anyone who can manage instances: admin, admin_user, branch_manager, teacher."""
        return self.role in {Role.ADMIN, Role.ADMIN_USER, Role.BRANCH_MANAGER, Role.TEACHER}


class LoginAuditLog(models.Model):
    user = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="login_logs",
    )
    username_attempted = models.CharField(max_length=150)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    country_code = models.CharField(max_length=2, blank=True, default="")
    user_agent = models.TextField(blank=True, default="")
    success = models.BooleanField()
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "login audit log"

    def __str__(self) -> str:
        status = "OK" if self.success else "FAIL"
        return f"{self.username_attempted} [{status}] @ {self.created_at:%Y-%m-%d %H:%M}"
