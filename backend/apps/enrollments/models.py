"""
Enrollment + QuestionAttempt models — full scoring logic in Phase 7/8.
"""
from django.db import models


class EnrollmentStatus(models.TextChoices):
    REGISTERED = "registered", "Registered"
    IN_PROGRESS = "in_progress", "In Progress"
    COMPLETED = "completed", "Completed"
    PAUSED = "paused", "Paused"


class Enrollment(models.Model):
    user = models.ForeignKey(
        "accounts.User",
        on_delete=models.CASCADE,
        related_name="enrollments",
    )
    instance = models.ForeignKey(
        "instances.Instance",
        on_delete=models.CASCADE,
        related_name="enrollments",
    )
    inherited_branch = models.ForeignKey(
        "branches.Branch",
        on_delete=models.PROTECT,
        related_name="enrollments",
    )
    status = models.CharField(
        max_length=15,
        choices=EnrollmentStatus.choices,
        default=EnrollmentStatus.REGISTERED,
        db_index=True,
    )
    score_total = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    # Set when the student explicitly clicks the Submit Test button. From this
    # moment on, the exam is locked: no further submissions accepted.
    submitted_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [("user", "instance")]
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.user.username} → {self.instance.name}"


class QuestionAttempt(models.Model):
    enrollment = models.ForeignKey(
        Enrollment,
        on_delete=models.CASCADE,
        related_name="attempts",
    )
    question = models.ForeignKey(
        "scenarios.Question",
        on_delete=models.CASCADE,
        related_name="attempts",
    )
    attempts = models.PositiveIntegerField(default=0)
    is_correct = models.BooleanField(default=False)
    hint_used = models.BooleanField(default=False)
    first_seen_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    active_seconds = models.PositiveIntegerField(default=0)
    score = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    last_attempt_text = models.TextField(blank=True, default="")

    class Meta:
        unique_together = [("enrollment", "question")]
        ordering = ["question__order"]

    def __str__(self) -> str:
        return f"{self.enrollment} Q#{self.question.order} ({'✓' if self.is_correct else '✗'})"
