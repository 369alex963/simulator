"""Moodle integration views — course list + import."""
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework import status

from apps.accounts.models import Role
from apps.accounts.permissions import IsBranchManagerOrAbove
from apps.instances.models import Instance
from .client import get_course_users, import_course_users


@api_view(["GET"])
@permission_classes([IsBranchManagerOrAbove])
def course_users_preview(request):
    """GET /api/moodle/course-users/?course_id=123  — preview users before import."""
    course_id = request.query_params.get("course_id")
    if not course_id:
        return Response({"detail": "course_id required."}, status=400)
    try:
        users = get_course_users(int(course_id))
    except Exception as e:
        return Response({"detail": str(e)}, status=400)

    return Response({
        "count": len(users),
        "users": [
            {"id": u.get("id"), "username": u.get("username"), "email": u.get("email"),
             "name": f"{u.get('firstname', '')} {u.get('lastname', '')}".strip()}
            for u in users
        ],
    })


@api_view(["POST"])
@permission_classes([IsBranchManagerOrAbove])
def import_course(request):
    """
    POST /api/moodle/import/
    {
      "course_id": 42,
      "instance_id": 7,       # optional — enroll in this instance
      "create_instance": true, # optional — create a new instance named after course
      "instance_name": "..."   # required if create_instance=true
    }
    """
    user = request.user
    course_id = request.data.get("course_id")
    if not course_id:
        return Response({"detail": "course_id required."}, status=400)

    # Determine branch
    if user.role in {Role.ADMIN, Role.ADMIN_USER}:
        branch_id = request.data.get("branch_id")
        if not branch_id:
            return Response({"detail": "branch_id required for admin import."}, status=400)
        from apps.branches.models import Branch
        try:
            branch = Branch.objects.get(pk=branch_id)
        except Branch.DoesNotExist:
            return Response({"detail": "Branch not found."}, status=404)
    else:
        branch = user.branch

    instance = None
    if request.data.get("create_instance"):
        name = request.data.get("instance_name", f"Moodle Course {course_id}")
        instance = Instance.objects.create(
            name=name,
            branch=branch,
            created_by=user,
            moodle_course_id=str(course_id),
            status="open",
        )
    elif request.data.get("instance_id"):
        try:
            instance = Instance.objects.get(pk=request.data["instance_id"])
        except Instance.DoesNotExist:
            return Response({"detail": "Instance not found."}, status=404)

    try:
        created = import_course_users(int(course_id), branch, instance, user)
    except Exception as e:
        return Response({"detail": str(e)}, status=400)

    return Response({
        "imported": len(created),
        "instance_id": instance.id if instance else None,
        "message": f"Imported {len(created)} students. Credentials sent via welcome email.",
    })


@api_view(["POST"])
@permission_classes([IsBranchManagerOrAbove])
def push_grades(request, instance_id):
    """Push all completed enrollment scores to Moodle for this instance."""
    from apps.instances.models import Instance
    from apps.enrollments.models import Enrollment
    from .client import push_grade

    try:
        instance = Instance.objects.get(pk=instance_id)
    except Instance.DoesNotExist:
        return Response(status=404)

    # Access check: admins have full access; branch managers must own the branch;
    # teachers must be assigned to the instance.
    requesting_user = request.user
    if requesting_user.role not in {Role.ADMIN, Role.ADMIN_USER}:
        has_access = (
            requesting_user.role == Role.BRANCH_MANAGER
            and instance.branch == requesting_user.branch
        ) or (
            requesting_user.role == Role.TEACHER
            and instance.teachers.filter(pk=requesting_user.pk).exists()
        )
        if not has_access:
            return Response({"detail": "Access denied."}, status=403)

    pushed = 0
    errors = []
    for e in instance.enrollments.filter(status="completed"):
        try:
            push_grade(e)
            pushed += 1
        except Exception as ex:
            errors.append(str(ex))

    instance.exported_at = timezone.now()
    instance.save(update_fields=["exported_at"])

    return Response({"pushed": pushed, "errors": errors})
