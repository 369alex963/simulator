"""Instance management — create, pause, archive, assign teachers, open/close registration."""
from django.db import transaction
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from apps.accounts.models import Role, User
from apps.accounts.permissions import IsAdminLevel, IsBranchManagerOrAbove, IsTeacherOrAbove
from apps.scenarios.models import Scenario
from .models import Instance, InstanceStatus
from .serializers import InstanceDetailSerializer, InstanceListSerializer, OpenInstanceSerializer


def _instance_access(user, instance) -> bool:
    """Does this user have any management access to this instance?"""
    if user.role in {Role.ADMIN, Role.ADMIN_USER}:
        return True
    if user.role == Role.BRANCH_MANAGER:
        return instance.branch == user.branch
    if user.role == Role.TEACHER:
        return instance.assigned_teachers.filter(pk=user.pk).exists()
    return False


# ── Open Instances (public — for register dropdown) ──────────────────────────

@api_view(["GET"])
@permission_classes([AllowAny])
def open_instances(request):
    qs = Instance.objects.filter(
        status=InstanceStatus.OPEN,
        registration_open=True,
    ).select_related("branch")
    # Filter out past deadline
    qs = [i for i in qs if i.can_register]
    return Response(OpenInstanceSerializer(qs, many=True).data)


# ── Full Instance CRUD (staff) ────────────────────────────────────────────────

@api_view(["GET", "POST"])
@permission_classes([IsBranchManagerOrAbove])
def instance_list(request):
    user = request.user
    if user.role in {Role.ADMIN, Role.ADMIN_USER}:
        qs = Instance.objects.select_related("branch", "scenario").all()
    else:
        qs = Instance.objects.filter(branch=user.branch).select_related("branch", "scenario")

    if request.method == "GET":
        return Response(InstanceListSerializer(qs, many=True).data)

    # POST — create
    data = dict(request.data)
    if user.role not in {Role.ADMIN, Role.ADMIN_USER}:
        data["branch_id"] = user.branch_id

    # Resolve scenario
    scenario_id = data.get("scenario_id") or request.data.get("scenario_id")
    branch_id = data.get("branch_id") or (user.branch_id if user.branch else None)

    from apps.branches.models import Branch
    try:
        branch = Branch.objects.get(pk=branch_id)
    except (Branch.DoesNotExist, TypeError):
        return Response({"detail": "Invalid branch."}, status=400)

    scenario = None
    if scenario_id:
        try:
            scenario = Scenario.objects.get(pk=scenario_id)
        except Scenario.DoesNotExist:
            return Response({"detail": "Scenario not found."}, status=400)

    instance = Instance.objects.create(
        name=request.data.get("name", ""),
        branch=branch,
        scenario=scenario,
        created_by=user,
        status=InstanceStatus.OPEN,
    )
    return Response(InstanceDetailSerializer(instance).data, status=status.HTTP_201_CREATED)


@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([IsBranchManagerOrAbove])
def instance_detail(request, pk):
    try:
        instance = Instance.objects.select_related("branch", "scenario").get(pk=pk)
    except Instance.DoesNotExist:
        return Response(status=404)

    if not _instance_access(request.user, instance):
        return Response(status=403)

    if request.method == "GET":
        return Response(InstanceDetailSerializer(instance).data)

    if request.method == "PATCH":
        serializer = InstanceDetailSerializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(InstanceDetailSerializer(instance).data)

    # DELETE — remove enrollments for this instance only, then delete the instance.
    # Do NOT delete student user accounts: they may be enrolled in other instances.
    with transaction.atomic():
        instance.enrollments.all().delete()
        instance.delete()
    return Response(status=204)


@api_view(["POST"])
@permission_classes([IsTeacherOrAbove])
def instance_pause(request, pk):
    try:
        instance = Instance.objects.get(pk=pk)
    except Instance.DoesNotExist:
        return Response(status=404)
    if not _instance_access(request.user, instance):
        return Response(status=403)

    if instance.status == InstanceStatus.PAUSED:
        instance.status = InstanceStatus.OPEN
    else:
        instance.status = InstanceStatus.PAUSED
    instance.save(update_fields=["status"])
    return Response({"status": instance.status})


@api_view(["POST"])
@permission_classes([IsBranchManagerOrAbove])
def instance_archive(request, pk):
    try:
        instance = Instance.objects.get(pk=pk)
    except Instance.DoesNotExist:
        return Response(status=404)
    if not _instance_access(request.user, instance):
        return Response(status=403)
    instance.status = InstanceStatus.ARCHIVED
    instance.archived_at = timezone.now()
    instance.save(update_fields=["status", "archived_at"])
    return Response({"status": instance.status})


@api_view(["POST"])
@permission_classes([IsBranchManagerOrAbove])
def instance_toggle_registration(request, pk):
    try:
        instance = Instance.objects.get(pk=pk)
    except Instance.DoesNotExist:
        return Response(status=404)
    if not _instance_access(request.user, instance):
        return Response(status=403)
    instance.registration_open = not instance.registration_open
    instance.save(update_fields=["registration_open"])
    return Response({"registration_open": instance.registration_open})


@api_view(["POST"])
@permission_classes([IsAdminLevel])
def instance_assign_teachers(request, pk):
    try:
        instance = Instance.objects.get(pk=pk)
    except Instance.DoesNotExist:
        return Response(status=404)
    if not _instance_access(request.user, instance):
        return Response(status=403)

    teacher_ids = request.data.get("teacher_ids", [])
    # Constrain teachers to the instance's branch (defence-in-depth)
    teachers = User.objects.filter(
        pk__in=teacher_ids,
        role__in=[Role.TEACHER, Role.BRANCH_MANAGER],
        branch=instance.branch,
    )
    instance.assigned_teachers.set(teachers)
    return Response({"assigned": [t.id for t in teachers]})


# ── Enrollment management (admin/branch_manager can enroll users in an instance) ─

@api_view(["GET", "POST", "DELETE"])
@permission_classes([IsBranchManagerOrAbove])
def instance_enrollments(request, pk):
    """
    GET    /api/instances/<pk>/enrollments/                — list enrolled student users
    POST   /api/instances/<pk>/enrollments/  {user_ids:[]} — enroll users
    DELETE /api/instances/<pk>/enrollments/  {user_ids:[]} — un-enroll users
    """
    from apps.enrollments.models import Enrollment
    try:
        instance = Instance.objects.select_related("branch").get(pk=pk)
    except Instance.DoesNotExist:
        return Response(status=404)
    if not _instance_access(request.user, instance):
        return Response(status=403)

    if request.method == "GET":
        # Pre-compute bonus / non-bonus ids for status flags
        if instance.scenario:
            bonus_ids = set(instance.scenario.questions.filter(is_bonus=True).values_list("id", flat=True))
            non_bonus_ids = set(instance.scenario.questions.filter(is_bonus=False).values_list("id", flat=True))
        else:
            bonus_ids, non_bonus_ids = set(), set()

        rows = []
        for e in instance.enrollments.select_related("user").prefetch_related("attempts").order_by("user__username"):
            correct_qids = set(a.question_id for a in e.attempts.all() if a.is_correct)
            bonus_answered = len(correct_qids & bonus_ids)
            non_bonus_answered = len(correct_qids & non_bonus_ids)
            all_bonus_answered = bool(bonus_ids) and bonus_answered == len(bonus_ids)
            all_non_bonus_answered = bool(non_bonus_ids) and non_bonus_answered == len(non_bonus_ids)
            rows.append({
                "id": e.id,
                "user_id": e.user_id,
                "username": e.user.username,
                "email": e.user.email,
                "status": e.status,
                "score_total": float(e.score_total),
                "started_at": e.started_at,
                "submitted_at": e.submitted_at,
                "completed_at": e.completed_at,
                "bonus_answered": bonus_answered,
                "bonus_total": len(bonus_ids),
                "non_bonus_answered": non_bonus_answered,
                "non_bonus_total": len(non_bonus_ids),
                "all_bonus_answered": all_bonus_answered,
                "all_non_bonus_answered": all_non_bonus_answered,
                "is_submitted": e.submitted_at is not None,
            })
        return Response(rows)

    user_ids = request.data.get("user_ids") or []
    if not isinstance(user_ids, list) or not user_ids:
        return Response({"detail": "user_ids list required."}, status=400)

    if request.method == "POST":
        # Only allow students; branch managers further restricted to own branch
        candidates = User.objects.filter(pk__in=user_ids, role=Role.STUDENT)
        if request.user.role == Role.BRANCH_MANAGER:
            candidates = candidates.filter(branch=request.user.branch)

        created = 0
        already = 0
        for user in candidates:
            _, was_created = Enrollment.objects.get_or_create(
                user=user,
                instance=instance,
                defaults={"inherited_branch": instance.branch},
            )
            if was_created:
                created += 1
            else:
                already += 1
        return Response({"enrolled": created, "already_enrolled": already})

    # DELETE — un-enroll
    qs = Enrollment.objects.filter(instance=instance, user_id__in=user_ids)
    if request.user.role == Role.BRANCH_MANAGER:
        qs = qs.filter(user__branch=request.user.branch)
    deleted, _ = qs.delete()
    return Response({"removed": deleted})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def my_enrollments(request):
    """
    GET /api/instances/my-enrollments/
    Returns the current user's enrollments (students) or assigned instances (teachers).
    Used by the instance-switcher UI in the exam / teacher pages.
    """
    from apps.enrollments.models import Enrollment

    user = request.user
    rows = []

    if user.role == Role.STUDENT:
        for e in (Enrollment.objects
                  .filter(user=user)
                  .select_related("instance", "instance__branch")
                  .order_by("-created_at")):
            rows.append({
                "enrollment_id": e.id,
                "instance_id": e.instance_id,
                "instance_name": e.instance.name,
                "instance_status": e.instance.status,
                "branch_name": e.instance.branch.name,
                "status": e.status,
                "started_at": e.started_at,
                "completed_at": e.completed_at,
            })
    elif user.role == Role.TEACHER:
        for inst in (Instance.objects
                     .filter(assigned_teachers=user)
                     .select_related("branch")
                     .order_by("-created_at")):
            rows.append({
                "instance_id": inst.id,
                "instance_name": inst.name,
                "instance_status": inst.status,
                "branch_name": inst.branch.name,
            })
    return Response(rows)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def select_enrollment(request):
    """
    POST /api/instances/select/  {enrollment_id: <id>}
    Sets a cookie remembering which enrollment is the "active" one — used to
    route the exam page when a student has more than one enrollment.
    """
    from apps.enrollments.models import Enrollment
    enrollment_id = request.data.get("enrollment_id")
    try:
        e = Enrollment.objects.get(pk=enrollment_id, user=request.user)
    except Enrollment.DoesNotExist:
        return Response({"detail": "Enrollment not found."}, status=404)
    response = Response({"enrollment_id": e.id, "instance_name": e.instance.name})
    response.set_cookie(
        "kernelios_active_enrollment",
        str(e.id),
        max_age=60 * 60 * 24 * 30,
        httponly=False,
        samesite="Lax",
    )
    return response
