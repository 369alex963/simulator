"""Per-role analytics summary endpoints."""
from django.db.models import Avg, Count, Q
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from apps.accounts.models import Role, User
from apps.accounts.permissions import IsAdminLevel, IsBranchManagerOrAbove, IsTeacherOrAbove
from apps.branches.models import Branch
from apps.enrollments.models import Enrollment, QuestionAttempt
from apps.instances.models import Instance


@api_view(["GET"])
@permission_classes([IsAdminLevel])
def admin_summary(request):
    stats = {
        "total_users": User.objects.filter(is_active=True).count(),
        "total_branches": Branch.objects.filter(is_active=True).count(),
        "total_instances": Instance.objects.count(),
        "active_instances": Instance.objects.filter(status="open").count(),
        "total_enrollments": Enrollment.objects.count(),
        "avg_score": float(
            Enrollment.objects.filter(status="completed")
            .aggregate(v=Avg("score_total"))["v"] or 0
        ),
    }
    return Response(stats)


@api_view(["GET"])
@permission_classes([IsBranchManagerOrAbove])
def branch_summary(request):
    user = request.user
    branch = getattr(user, "branch", None)
    if branch is None:
        # Admin without a branch — cross-branch analytics belong on the admin endpoint
        return Response(
            {"detail": "Use admin-summary endpoint for cross-branch analytics."},
            status=400,
        )
    qs = Enrollment.objects.filter(instance__branch=branch)
    stats = {
        "branch_name": branch.name,
        "total_users": User.objects.filter(branch=branch, is_active=True).count(),
        "active_instances": Instance.objects.filter(branch=branch, status="open").count(),
        "total_enrollments": qs.count(),
        "completed_enrollments": qs.filter(status="completed").count(),
        "avg_score": float(
            qs.filter(status="completed").aggregate(v=Avg("score_total"))["v"] or 0
        ),
    }
    return Response(stats)


@api_view(["GET"])
@permission_classes([IsTeacherOrAbove])
def teacher_summary(request):
    user = request.user
    if user.role in {Role.ADMIN, Role.ADMIN_USER}:
        instances = Instance.objects.all()
    elif user.role == Role.BRANCH_MANAGER:
        instances = Instance.objects.filter(branch=user.branch)
    else:
        instances = user.assigned_instances.all()

    qs = Enrollment.objects.filter(instance__in=instances)
    stats = {
        "assigned_instances": instances.count(),
        "total_students": qs.count(),
        "completed_students": qs.filter(status="completed").count(),
        "avg_score": float(
            qs.filter(status="completed").aggregate(v=Avg("score_total"))["v"] or 0
        ),
    }
    return Response(stats)


@api_view(["GET"])
@permission_classes([IsAdminLevel])
def admin_instance_analytics(request, pk):
    """Per-question analytics for a specific instance (admin/branch/teacher)."""
    try:
        instance = Instance.objects.get(pk=pk)
    except Instance.DoesNotExist:
        return Response(status=404)

    enrollments = instance.enrollments.all()
    questions = list(instance.scenario.questions.all()) if instance.scenario else []

    # Batch all per-question stats in a single query instead of N+1 per question
    question_stats_qs = (
        QuestionAttempt.objects
        .filter(enrollment__in=enrollments)
        .values("question_id")
        .annotate(
            total_attempts=Count("id"),
            correct_count=Count("id", filter=Q(is_correct=True)),
            avg_attempts=Avg("attempts"),
            avg_time_seconds=Avg("active_seconds"),
        )
    )
    stats_by_q = {s["question_id"]: s for s in question_stats_qs}

    rows = []
    for q in questions:
        s = stats_by_q.get(q.id, {})
        total = s.get("total_attempts", 0)
        correct = s.get("correct_count", 0)
        rows.append({
            "question_id": q.id,
            "order": q.order,
            "title": q.title,
            "is_bonus": q.is_bonus,
            "total_attempts": total,
            "correct_count": correct,
            "pct_correct": round(correct / total * 100, 1) if total else 0,
            "avg_attempts": float(s.get("avg_attempts") or 0),
            "avg_time_seconds": float(s.get("avg_time_seconds") or 0),
        })

    return Response({
        "instance_id": pk,
        "instance_name": instance.name,
        "enrollment_count": enrollments.count(),
        "questions": rows,
    })


# ─────────────────────────────────────────────────────────────────────
#  Deep analytics — comprehensive data for charts & visualisations
# ─────────────────────────────────────────────────────────────────────

@api_view(["GET"])
@permission_classes([IsAdminLevel])
def admin_deep_analytics(request):
    """
    GET /api/analytics/admin-deep/?instance=<id>
    Returns: score distribution, completion timeline, per-role stats, top performers,
    branch breakdown, question difficulty, hint usage.
    """
    from django.db.models import Sum, Min, Max
    from datetime import timedelta
    from django.utils import timezone

    instance_id = request.query_params.get("instance")
    enrollments = Enrollment.objects.all()
    if instance_id and instance_id != "all":
        enrollments = enrollments.filter(instance_id=instance_id)
    completed = enrollments.filter(status="completed")

    # 1. Score distribution buckets (0-10, 11-20, ..., 91-100)
    buckets = [0] * 10
    for e in completed.only("score_total"):
        idx = min(int(float(e.score_total) // 10), 9)
        buckets[idx] += 1
    score_distribution = [
        {"range": f"{i*10}-{i*10+9}", "count": buckets[i]} for i in range(10)
    ]

    # 2. Completion timeline — last 30 days
    now = timezone.now()
    timeline = []
    for days_ago in range(29, -1, -1):
        day = (now - timedelta(days=days_ago)).date()
        day_count = completed.filter(completed_at__date=day).count()
        timeline.append({"date": day.isoformat(), "completed": day_count})

    # 3. Per-role stats
    role_stats = []
    for role_code, role_label in [(Role.STUDENT, "Students"), (Role.TEACHER, "Teachers"),
                                    (Role.BRANCH_MANAGER, "Branch Managers"), (Role.ADMIN_USER, "Admins")]:
        count = User.objects.filter(role=role_code, is_active=True).count()
        role_stats.append({"role": role_label, "count": count})

    # 4. Top performers
    top = list(
        completed.select_related("user", "instance").order_by("-score_total")[:10]
        .values("user__username", "score_total", "instance__name")
    )
    top_performers = [
        {"username": t["user__username"], "score": float(t["score_total"]), "instance": t["instance__name"]}
        for t in top
    ]

    # 5. Per-branch breakdown
    branch_breakdown = []
    for b in Branch.objects.filter(is_active=True):
        b_qs = enrollments.filter(instance__branch=b)
        b_complete = b_qs.filter(status="completed")
        branch_breakdown.append({
            "branch": b.name,
            "enrolled": b_qs.count(),
            "completed": b_complete.count(),
            "avg_score": float(b_complete.aggregate(v=Avg("score_total"))["v"] or 0),
        })

    # 6. Question difficulty (per-question correct rate) for selected instance
    question_difficulty = []
    if instance_id and instance_id != "all":
        try:
            inst = Instance.objects.get(pk=instance_id)
            if inst.scenario:
                for q in inst.scenario.questions.order_by("order"):
                    attempts = QuestionAttempt.objects.filter(enrollment__instance=inst, question=q)
                    total = attempts.count()
                    correct = attempts.filter(is_correct=True).count()
                    question_difficulty.append({
                        "order": q.order,
                        "title": q.title[:40],
                        "pct_correct": round(correct / total * 100, 1) if total else 0,
                        "avg_attempts": float(attempts.aggregate(v=Avg("attempts"))["v"] or 0),
                        "hint_pct": round(attempts.filter(hint_used=True).count() / total * 100, 1) if total else 0,
                    })
        except Instance.DoesNotExist:
            pass

    # 7. Headline numbers
    avg = completed.aggregate(v=Avg("score_total"), mn=Min("score_total"), mx=Max("score_total"))
    headline = {
        "total_enrollments": enrollments.count(),
        "total_completed": completed.count(),
        "completion_rate": round(completed.count() / enrollments.count() * 100, 1) if enrollments.count() else 0,
        "avg_score": float(avg["v"] or 0),
        "min_score": float(avg["mn"] or 0),
        "max_score": float(avg["mx"] or 0),
        "total_hint_uses": QuestionAttempt.objects.filter(
            enrollment__in=enrollments, hint_used=True
        ).count(),
    }

    return Response({
        "instance_id": instance_id or "all",
        "headline": headline,
        "score_distribution": score_distribution,
        "completion_timeline": timeline,
        "role_stats": role_stats,
        "top_performers": top_performers,
        "branch_breakdown": branch_breakdown,
        "question_difficulty": question_difficulty,
    })
