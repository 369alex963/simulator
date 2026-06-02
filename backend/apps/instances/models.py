"""
Instance model — full implementation in Phase 6.
Stub is here so accounts.register_view can import Instance safely,
and so Django migration graph is consistent from Phase 1.
"""
from django.db import models
from django.utils import timezone


class InstanceStatus(models.TextChoices):
    DRAFT = "draft", "Draft"
    OPEN = "open", "Open"
    PAUSED = "paused", "Paused"
    CLOSED = "closed", "Closed"
    ARCHIVED = "archived", "Archived"


class Instance(models.Model):
    name = models.CharField(max_length=200, unique=True)
    scenario = models.ForeignKey(
        "scenarios.Scenario",
        on_delete=models.PROTECT,
        related_name="instances",
        null=True,  # nullable until Phase 5 Scenario model lands
    )
    branch = models.ForeignKey(
        "branches.Branch",
        on_delete=models.PROTECT,
        related_name="instances",
    )
    created_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        related_name="created_instances",
    )
    assigned_teachers = models.ManyToManyField(
        "accounts.User",
        blank=True,
        related_name="assigned_instances",
    )
    status = models.CharField(
        max_length=10,
        choices=InstanceStatus.choices,
        default=InstanceStatus.DRAFT,
        db_index=True,
    )
    registration_open = models.BooleanField(default=True, db_index=True)
    registration_closes_at = models.DateTimeField(null=True, blank=True)

    # Moodle
    moodle_course_id = models.CharField(max_length=64, blank=True, default="")
    moodle_auto_push = models.BooleanField(default=False)

    # Export tracking
    exported_at = models.DateTimeField(null=True, blank=True)
    exported_by = models.ForeignKey(
        "accounts.User",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="exports_done",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    archived_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.name} [{self.status}]"

    @property
    def can_register(self) -> bool:
        if self.status != InstanceStatus.OPEN:
            return False
        if not self.registration_open:
            return False
        if self.registration_closes_at and self.registration_closes_at < timezone.now():
            return False
        return True
