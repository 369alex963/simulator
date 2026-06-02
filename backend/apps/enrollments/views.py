"""Exam-taking views: submit answer, get question state, scoreboard."""
from decimal import Decimal
from django.db import transaction
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.accounts.models import Role
from apps.accounts.permissions import IsAuthenticated as KernelAuth
from apps.instances.models import Instance, InstanceStatus
from apps.scenarios.models import Question
from .models import Enrollment, EnrollmentStatus, QuestionAttempt
from .scoring import update_enrollment_score


def _get_enrollment(user, request=None) -> "Enrollment | None":
    """
    Return the student's active enrollment, or None.
    If a `kernelios_active_enrollment` cookie is present and points to a valid
    enrollment for this user, prefer it. Otherwise fall back to the most recent.
    """
    qs = (
        Enrollment.objects
        .filter(user=user)
        .select_related("instance", "instance__scenario", "instance__branch")
    )
    if request is not None:
        cookie_val = request.COOKIES.get("kernelios_active_enrollment")
        if cookie_val:
            try:
                preferred = qs.filter(pk=int(cookie_val)).first()
                if preferred:
                    return preferred
            except (ValueError, TypeError):
                pass
    return qs.order_by("-created_at").first()


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def exam_state(request):
    """
    GET /api/exam/state/
    Returns the student's enrollment, instance status, and current question list
    with is_answered, is_current, is_locked per question.

    Sequential mode: only the current question's content (prompt + choices) is
    exposed; future questions are returned as metadata stubs so the sidebar can
    render a locked placeholder without leaking the prompt text.
    """
    if request.user.role != Role.STUDENT:
        return Response({"detail": "Students only."}, status=403)

    enrollment = _get_enrollment(request.user, request)
    if not enrollment:
        return Response({"detail": "Not enrolled in any instance."}, status=404)

    instance = enrollment.instance
    scenario = instance.scenario
    is_paused = instance.status == InstanceStatus.PAUSED
    is_sequential = bool(scenario and scenario.sequential)
    has_started = enrollment.started_at is not None

    questions = list(scenario.questions.order_by("order")) if scenario else []
    attempts_map = {
        a.question_id: a
        for a in QuestionAttempt.objects.filter(enrollment=enrollment)
    }
    correct_ids = {qid for qid, a in attempts_map.items() if a.is_correct}

    # First unanswered non-bonus question
    first_unanswered_idx = None
    for idx, q in enumerate(questions):
        if not q.is_bonus and q.id not in correct_ids:
            first_unanswered_idx = idx
            break

    question_states = []
    for idx, q in enumerate(questions):
        attempt = attempts_map.get(q.id)
        answered = bool(attempt and attempt.is_correct)
        is_current = idx == first_unanswered_idx

        # Sequential mode: future non-bonus questions are READABLE but LOCKED
        # for submission. The frontend disables the answer input but renders the
        # prompt so the student can read ahead. Bonus questions are unlocked
        # since they're outside the sequential chain.
        locked = is_sequential and not answered and not is_current and not q.is_bonus

        qdata = {
            "id": q.id,
            "order": q.order,
            "title": q.title,
            "prompt": q.prompt,
            "question_type": q.question_type,
            "is_bonus": q.is_bonus,
            "base_points": float(q.base_points),
            "choices": q.choices,
            "has_hint": bool(q.hint),
            "is_answered": answered,
            "is_current": is_current,
            "is_locked": locked,
            "attempts": attempt.attempts if attempt else 0,
            "hint_used": attempt.hint_used if attempt else False,
            # Timestamps drive the persistent per-question timer in the UI
            # Do not leak first_seen_at for questions the student hasn't unlocked yet
            "first_seen_at": (attempt.first_seen_at if attempt else None) if not locked else None,
            "completed_at": attempt.completed_at if attempt else None,
            "active_seconds": attempt.active_seconds if attempt else 0,
        }
        question_states.append(qdata)

    answered_count = sum(1 for q in question_states if q["is_answered"])
    non_bonus_total = sum(1 for q in questions if not q.is_bonus)
    all_answered = answered_count >= non_bonus_total

    bonus_questions = [q for q in questions if q.is_bonus]
    bonus_answered = sum(1 for q in bonus_questions if q.id in correct_ids)
    all_bonus_answered = bool(bonus_questions) and bonus_answered == len(bonus_questions)

    is_submitted = enrollment.submitted_at is not None
    # An exam is "complete" (locked) either via explicit Submit Test or when
    # every non-bonus question has been answered correctly.
    is_complete = is_submitted or all_answered

    # Sum of all active seconds per attempt — accurate per-question work time
    total_active_seconds = sum(a.active_seconds for a in attempts_map.values())

    return Response({
        "enrollment_id": enrollment.id,
        "instance_id": instance.id,
        "instance_name": instance.name,
        "instance_status": instance.status,
        "is_paused": is_paused,
        "is_sequential": is_sequential,
        "has_started": has_started,
        "started_at": enrollment.started_at,
        "submitted_at": enrollment.submitted_at,
        "completed_at": enrollment.completed_at,
        "is_submitted": is_submitted,
        "total_active_seconds": total_active_seconds,
        "scenario_description": scenario.description if scenario else "",
        "allow_hints": bool(scenario and scenario.allow_hints),
        "status": enrollment.status,
        "is_complete": is_complete,
        "all_answered": all_answered,
        "all_bonus_answered": all_bonus_answered,
        "bonus_total": len(bonus_questions),
        "bonus_answered": bonus_answered,
        "answered_count": answered_count,
        "total_questions": len(questions),
        "non_bonus_total": non_bonus_total,
        "questions": question_states,
    })


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def start_exam(request):
    """
    POST /api/exam/start/
    Mark the enrollment as started so the timer begins and questions become
    visible. Idempotent — safe to call repeatedly.
    """
    if request.user.role != Role.STUDENT:
        return Response({"detail": "Students only."}, status=403)
    enrollment = _get_enrollment(request.user, request)
    if not enrollment:
        return Response({"detail": "Not enrolled."}, status=404)
    if enrollment.started_at is None:
        enrollment.started_at = timezone.now()
        if enrollment.status == EnrollmentStatus.REGISTERED:
            enrollment.status = EnrollmentStatus.IN_PROGRESS
        enrollment.save(update_fields=["started_at", "status"])
    return Response({"started_at": enrollment.started_at, "status": enrollment.status})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def submit_test(request):
    """
    POST /api/exam/submit-test/
    Mark the exam as submitted by the student. Locks all further submissions
    and stamps the total elapsed time. Idempotent.
    """
    if request.user.role != Role.STUDENT:
        return Response({"detail": "Students only."}, status=403)
    enrollment = _get_enrollment(request.user, request)
    if not enrollment:
        return Response({"detail": "Not enrolled."}, status=404)
    if enrollment.submitted_at is None:
        now = timezone.now()
        enrollment.submitted_at = now
        enrollment.completed_at = now
        enrollment.status = EnrollmentStatus.COMPLETED
        enrollment.save(update_fields=["submitted_at", "completed_at", "status"])
    return Response({
        "submitted_at": enrollment.submitted_at,
        "completed_at": enrollment.completed_at,
        "status": enrollment.status,
    })


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def submit_answer(request, question_id):
    """
    POST /api/exam/submit/<question_id>/
    Body: { "answer": "...", "time_spent": <seconds> }
    """
    if request.user.role != Role.STUDENT:
        return Response({"detail": "Students only."}, status=403)

    enrollment = _get_enrollment(request.user, request)
    if not enrollment:
        return Response({"detail": "Not enrolled."}, status=404)

    if enrollment.submitted_at is not None:
        return Response({"detail": "Exam already submitted."}, status=400)

    if enrollment.instance.status == InstanceStatus.PAUSED:
        return Response({"detail": "Exam is paused."}, status=400)

    try:
        question = Question.objects.get(
            pk=question_id,
            scenario=enrollment.instance.scenario,
        )
    except Question.DoesNotExist:
        return Response(status=404)

    # Enforce sequential: all previous questions must be answered
    if question.is_bonus is False and enrollment.instance.scenario.sequential:
        prior = Question.objects.filter(
            scenario=enrollment.instance.scenario,
            order__lt=question.order,
            is_bonus=False,
        )
        answered_ids = set(
            QuestionAttempt.objects.filter(
                enrollment=enrollment, is_correct=True
            ).values_list("question_id", flat=True)
        )
        if not all(p.id in answered_ids for p in prior):
            return Response({"detail": "Answer previous questions first."}, status=400)

    attempt, _ = QuestionAttempt.objects.get_or_create(
        enrollment=enrollment, question=question
    )

    if attempt.is_correct:
        return Response({"correct": True, "already_answered": True})

    answer_text = str(request.data.get("answer", "")).strip()
    time_spent = int(request.data.get("time_spent", 0))
    attempt.attempts += 1
    attempt.active_seconds += time_spent
    attempt.last_attempt_text = answer_text

    is_correct = question.validate_answer(answer_text)
    if is_correct:
        now = timezone.now()
        attempt.is_correct = True
        attempt.completed_at = now
        # active_seconds is now the wall-clock duration from first_seen_at to
        # completed_at (when the student first viewed this question to when
        # they answered it correctly). This is what the user sees in the
        # per-question timer and what penalties use.
        if attempt.first_seen_at:
            attempt.active_seconds = max(
                int((now - attempt.first_seen_at).total_seconds()),
                attempt.active_seconds,  # keep at least previously stored value
            )
        if enrollment.status == EnrollmentStatus.REGISTERED:
            enrollment.status = EnrollmentStatus.IN_PROGRESS
            enrollment.started_at = now
            enrollment.save(update_fields=["status", "started_at"])

    attempt.save()

    # Recalculate total score
    if is_correct:
        total = update_enrollment_score(enrollment)

        # Check completion (all non-bonus answered)
        non_bonus = Question.objects.filter(
            scenario=enrollment.instance.scenario, is_bonus=False
        ).count()
        answered_non_bonus = QuestionAttempt.objects.filter(
            enrollment=enrollment, is_correct=True,
            question__is_bonus=False,
        ).count()
        if answered_non_bonus >= non_bonus:
            with transaction.atomic():
                # Re-fetch with a row lock to prevent double-scoring from
                # two concurrent requests both passing the completion check.
                enrollment = Enrollment.objects.select_for_update().get(pk=enrollment.pk)
                if enrollment.submitted_at is not None:
                    # Already completed by a concurrent request — nothing to do.
                    pass
                else:
                    now = timezone.now()
                    enrollment.status = EnrollmentStatus.COMPLETED
                    enrollment.completed_at = now
                    # Answering the LAST non-bonus question is treated the same as
                    # clicking Submit Test — the exam is locked and the total timer
                    # stops here.
                    enrollment.submitted_at = now
                    enrollment.save(update_fields=["status", "completed_at", "submitted_at"])

                    # Auto-push grades to Moodle if enabled
                    if enrollment.instance.moodle_auto_push and enrollment.instance.moodle_course_id:
                        from apps.moodle.client import push_grade
                        try:
                            push_grade(enrollment)
                        except Exception:
                            pass

    return Response({
        "correct": is_correct,
        "attempts": attempt.attempts,
        "message": "Correct!" if is_correct else "Wrong answer, try again.",
    })


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def view_question(request, question_id):
    """
    POST /api/exam/view/<question_id>/
    Stamps the QuestionAttempt's first_seen_at when the student first views
    the question. Idempotent: if first_seen_at already set, returns it unchanged.

    The per-question timer in the UI is driven by this server timestamp so it
    persists across refreshes and won't reset.
    """
    if request.user.role != Role.STUDENT:
        return Response({"detail": "Students only."}, status=403)
    enrollment = _get_enrollment(request.user, request)
    if not enrollment:
        return Response({"detail": "Not enrolled."}, status=404)
    if enrollment.submitted_at is not None:
        return Response({"detail": "Exam already submitted."}, status=400)
    try:
        question = Question.objects.get(
            pk=question_id,
            scenario=enrollment.instance.scenario,
        )
    except Question.DoesNotExist:
        return Response(status=404)
    attempt, _ = QuestionAttempt.objects.get_or_create(
        enrollment=enrollment, question=question,
    )
    if attempt.first_seen_at is None:
        attempt.first_seen_at = timezone.now()
        attempt.save(update_fields=["first_seen_at"])
    return Response({
        "question_id": question.id,
        "first_seen_at": attempt.first_seen_at,
        "completed_at": attempt.completed_at,
        "is_correct": attempt.is_correct,
        "active_seconds": attempt.active_seconds,
    })


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def use_hint(request, question_id):
    """Record hint usage."""
    if request.user.role != Role.STUDENT:
        return Response({"detail": "Students only."}, status=403)
    enrollment = _get_enrollment(request.user, request)
    if enrollment is None:
        return Response({"detail": "No active enrollment."}, status=404)
    if enrollment.submitted_at is not None:
        return Response({"detail": "Exam already submitted."}, status=400)
    # Scope question to the enrollment's scenario
    try:
        question = Question.objects.get(pk=question_id, scenario=enrollment.instance.scenario)
    except Question.DoesNotExist:
        return Response({"detail": "Question not found."}, status=404)
    attempt, _ = QuestionAttempt.objects.get_or_create(enrollment=enrollment, question=question)
    attempt.hint_used = True
    attempt.save(update_fields=["hint_used"])
    return Response({"hint": question.hint})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def scoreboard(request, instance_id):
    """
    GET /api/exam/scoreboard/<instance_id>/
    Returns rank-ordered list (no actual scores for students).
    """
    try:
        instance = Instance.objects.get(pk=instance_id)
    except Instance.DoesNotExist:
        return Response(status=404)

    user = request.user
    if user.role == Role.STUDENT:
        if not instance.enrollments.filter(user=user).exists():
            return Response(status=403)
    elif user.role not in {Role.ADMIN, Role.ADMIN_USER}:
        # Teacher/branch_manager must have access to this instance
        has_access = (
            user.role == Role.BRANCH_MANAGER and instance.branch == user.branch
        ) or (
            user.role == Role.TEACHER and instance.assigned_teachers.filter(pk=user.pk).exists()
        )
        if not has_access:
            return Response(status=403)

    is_staff = request.user.role in {
        Role.ADMIN, Role.ADMIN_USER, Role.BRANCH_MANAGER, Role.TEACHER
    }
    enrollments = (
        instance.enrollments
        .select_related("user")
        .prefetch_related("attempts")
        .order_by("-score_total", "-created_at")
    )

    # Pre-compute bonus + non-bonus question id sets
    if instance.scenario:
        bonus_ids = set(instance.scenario.questions.filter(is_bonus=True).values_list("id", flat=True))
        non_bonus_ids = set(instance.scenario.questions.filter(is_bonus=False).values_list("id", flat=True))
    else:
        bonus_ids, non_bonus_ids = set(), set()

    rows = []
    for rank, e in enumerate(enrollments, start=1):
        # Use the prefetch cache — no extra queries per enrollment
        all_attempts = list(e.attempts.all())
        correct_qids = {a.question_id for a in all_attempts if a.is_correct}
        bonus_answered_count = len(correct_qids & bonus_ids)
        non_bonus_answered_count = len(correct_qids & non_bonus_ids)
        all_bonus_answered = bool(bonus_ids) and bonus_answered_count == len(bonus_ids)
        all_non_bonus_answered = bool(non_bonus_ids) and non_bonus_answered_count == len(non_bonus_ids)
        total_active = sum(a.active_seconds for a in all_attempts)
        row = {
            "rank": rank,
            "username": e.user.username,
            "questions_answered": len(correct_qids),
            "status": e.status,
            "started_at": e.started_at,
            "submitted_at": e.submitted_at,
            "completed_at": e.completed_at,
            "bonus_answered": bonus_answered_count,
            "bonus_total": len(bonus_ids),
            "non_bonus_answered": non_bonus_answered_count,
            "non_bonus_total": len(non_bonus_ids),
            "all_bonus_answered": all_bonus_answered,
            "all_non_bonus_answered": all_non_bonus_answered,
            "is_submitted": e.submitted_at is not None,
            "total_active_seconds": total_active,
        }
        if is_staff:
            row["score"] = float(e.score_total)
        rows.append(row)

    return Response({"instance": instance.name, "scoreboard": rows})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def student_progress(request):
    """Student's own progress stats — no actual score shown."""
    if request.user.role != Role.STUDENT:
        return Response({"detail": "Students only."}, status=403)
    enrollment = _get_enrollment(request.user, request)
    if not enrollment:
        return Response({"detail": "Not enrolled."}, status=404)

    questions = list(
        enrollment.instance.scenario.questions.order_by("order")
        if enrollment.instance.scenario else []
    )
    attempts = {a.question_id: a for a in enrollment.attempts.all()}

    total = len(questions)
    answered = sum(1 for q in questions if attempts.get(q.id) and attempts[q.id].is_correct)
    non_bonus = sum(1 for q in questions if not q.is_bonus)
    answered_non_bonus = sum(
        1 for q in questions if not q.is_bonus and attempts.get(q.id) and attempts[q.id].is_correct
    )

    per_question = []
    for q in questions:
        att = attempts.get(q.id)
        per_question.append({
            "id": q.id,
            "title": q.title,
            "order": q.order,
            "is_bonus": q.is_bonus,
            "base_points": float(q.base_points),
            "answered": bool(att and att.is_correct),
            "attempts": att.attempts if att else 0,
            "hint_used": att.hint_used if att else False,
            "time_spent": att.active_seconds if att else 0,
        })

    total_active = sum(a.active_seconds for a in attempts.values())
    return Response({
        "total_questions": total,
        "answered": answered,
        "answered_non_bonus": answered_non_bonus,
        "non_bonus_total": non_bonus,
        "pct_complete": round(answered_non_bonus / non_bonus * 100, 1) if non_bonus else 0,
        "status": enrollment.status,
        "started_at": enrollment.started_at,
        "completed_at": enrollment.completed_at,
        "submitted_at": enrollment.submitted_at,
        "total_active_seconds": total_active,
        "questions": per_question,
    })
