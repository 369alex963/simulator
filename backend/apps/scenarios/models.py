"""Scenario + Question + ScoringRules models (full CRUD in Phase 5)."""
from django.db import models


class QuestionType(models.TextChoices):
    TEXT = "text", "Text Input"
    MULTIPLE_CHOICE = "multiple_choice", "Multiple Choice"
    TRUE_FALSE = "true_false", "True / False"


class Scenario(models.Model):
    name = models.CharField(max_length=200, unique=True)
    description = models.TextField(blank=True)
    allow_hints = models.BooleanField(default=False)
    randomize_questions = models.BooleanField(default=False)
    sequential = models.BooleanField(default=True)
    created_by = models.ForeignKey(
        "accounts.User",
        null=True,
        on_delete=models.SET_NULL,
        related_name="scenarios",
    )
    # Scenarios are NEVER archived — archiving is for instances only.
    # Deleting a scenario is a real delete (instances using it must be moved/closed first).
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return self.name


class Question(models.Model):
    scenario = models.ForeignKey(
        Scenario,
        on_delete=models.CASCADE,
        related_name="questions",
    )
    order = models.PositiveIntegerField(db_index=True)
    title = models.CharField(max_length=200)
    prompt = models.TextField()
    question_type = models.CharField(
        max_length=20,
        choices=QuestionType.choices,
        default=QuestionType.TEXT,
    )
    is_bonus = models.BooleanField(default=False)
    base_points = models.DecimalField(max_digits=5, decimal_places=2, default=5)
    correct_answer = models.TextField()
    choices = models.JSONField(null=True, blank=True)
    hint = models.TextField(blank=True)
    explanation = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [("scenario", "order")]
        ordering = ["order"]

    def __str__(self) -> str:
        return f"{self.scenario.name} Q{self.order}: {self.title}"

    def validate_answer(self, answer: str) -> bool:
        if self.question_type == QuestionType.TEXT:
            return answer.strip().lower() == self.correct_answer.strip().lower()
        # multiple_choice / true_false: exact match
        return answer.strip() == self.correct_answer.strip()


class ScoringRules(models.Model):
    scenario = models.OneToOneField(
        Scenario,
        on_delete=models.CASCADE,
        related_name="scoring_rules",
    )
    # Attempt penalties
    attempt_penalty_after_n = models.PositiveIntegerField(
        default=1,
        help_text="Penalty starts after this many wrong attempts. 1 = no free attempt.",
    )
    attempt_penalty_per_mistake = models.DecimalField(
        max_digits=4, decimal_places=2, default="0.50"
    )
    max_attempt_penalty = models.DecimalField(
        max_digits=4, decimal_places=2, default="1.50"
    )
    # Time penalties
    time_penalty_threshold_minutes = models.PositiveIntegerField(default=5)
    time_penalty_per_minute = models.DecimalField(
        max_digits=4, decimal_places=2, default="0.25"
    )
    max_time_penalty = models.DecimalField(
        max_digits=4, decimal_places=2, default="1.50"
    )
    # Hint penalty (0 = no penalty for using hints)
    hint_penalty = models.DecimalField(
        max_digits=4, decimal_places=2, default="0.00"
    )

    def __str__(self) -> str:
        return f"ScoringRules for {self.scenario}"
