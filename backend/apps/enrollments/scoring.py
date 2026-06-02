"""
Pure scoring engine — no Django ORM writes here.
Call update_enrollment_score() after each correct answer.
"""
from __future__ import annotations
from decimal import Decimal
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from .models import Enrollment, QuestionAttempt
    from apps.scenarios.models import ScoringRules, Question


def _get_rules(enrollment: "Enrollment") -> "ScoringRules | None":
    try:
        return enrollment.instance.scenario.scoring_rules
    except Exception:
        return None


def calculate_question_score(
    attempt: "QuestionAttempt",
    rules: "ScoringRules | None",
) -> Decimal:
    """Compute the score for a single correctly-answered question attempt."""
    question = attempt.question
    base = question.base_points  # Decimal

    if rules is None:
        return max(Decimal("0"), base)

    # ── Attempt penalty ──────────────────────────────────────────────────
    wrong_attempts = max(0, attempt.attempts - 1)  # subtract the final correct one
    penalisable = max(0, wrong_attempts - rules.attempt_penalty_after_n)
    attempt_penalty = min(
        rules.max_attempt_penalty,
        Decimal(str(penalisable)) * rules.attempt_penalty_per_mistake,
    )

    # ── Time penalty ─────────────────────────────────────────────────────
    minutes = Decimal(str(attempt.active_seconds)) / Decimal("60")
    excess_minutes = max(Decimal("0"), minutes - Decimal(str(rules.time_penalty_threshold_minutes)))
    time_penalty = min(
        rules.max_time_penalty,
        excess_minutes * rules.time_penalty_per_minute,
    )

    # ── Hint penalty ──────────────────────────────────────────────────────
    hint_penalty = rules.hint_penalty if attempt.hint_used else Decimal("0")

    raw = base - attempt_penalty - time_penalty - hint_penalty
    return max(Decimal("0"), raw)


def update_enrollment_score(enrollment: "Enrollment") -> Decimal:
    """Recalculate and save the total score for an enrollment. Returns the new total."""
    rules = _get_rules(enrollment)
    attempts = enrollment.attempts.filter(is_correct=True).select_related("question")

    total = Decimal("0")
    for attempt in attempts:
        q_score = calculate_question_score(attempt, rules)
        attempt.score = q_score
        attempt.save(update_fields=["score"])
        total += q_score

    # Hard cap at 100
    total = min(Decimal("100"), total)
    enrollment.score_total = total
    enrollment.save(update_fields=["score_total"])
    return total
