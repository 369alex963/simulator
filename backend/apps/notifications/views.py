"""Announcements, Email templates, Help requests, SSE stream."""
import json
import time

from django.http import StreamingHttpResponse
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import serializers as drf_serializers

from apps.accounts.models import Role
from apps.accounts.permissions import IsAdminLevel, IsTeacherOrAbove
from apps.core.models import AppConfig
from .models import Announcement, HelpRequest


class AnnouncementSerializer(drf_serializers.ModelSerializer):
    class Meta:
        model = Announcement
        fields = ["id", "scope", "branch", "instance", "title", "message",
                  "severity", "is_active", "created_at", "expires_at"]


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def announcements(request):
    user = request.user

    if request.method == "GET":
        now = timezone.now()
        from django.db.models import Q
        qs = Announcement.objects.filter(is_active=True).filter(
            Q(expires_at__isnull=True) | Q(expires_at__gt=now)
        )

        if user.role == Role.STUDENT:
            # Students see global + their branch + their instance announcements
            from apps.enrollments.models import Enrollment
            enrollment = Enrollment.objects.filter(user=user).order_by("-created_at").first()
            instance_id = enrollment.instance_id if enrollment else None
            qs = qs.filter(
                Q(scope="global")
                | Q(scope="branch", branch=user.branch)
                | (Q(scope="instance", instance_id=instance_id) if instance_id else Q())
            )
        elif user.role in {Role.TEACHER}:
            qs = qs.filter(Q(scope__in=["global", "branch"]) | Q(scope="instance", instance__assigned_teachers=user))
        elif user.role == Role.BRANCH_MANAGER:
            qs = qs.filter(Q(scope__in=["global"]) | Q(scope="branch", branch=user.branch) | Q(scope="instance", instance__branch=user.branch))

        return Response(AnnouncementSerializer(qs, many=True).data)

    # POST — create announcement (staff only)
    if user.role not in {Role.ADMIN, Role.ADMIN_USER, Role.BRANCH_MANAGER, Role.TEACHER}:
        return Response(status=403)

    serializer = AnnouncementSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    serializer.save(created_by=user)
    return Response(serializer.data, status=201)


@api_view(["PATCH", "DELETE"])
@permission_classes([IsTeacherOrAbove])
def announcement_detail(request, pk):
    try:
        ann = Announcement.objects.get(pk=pk)
    except Announcement.DoesNotExist:
        return Response(status=404)

    # Fix #4: ownership / scope check before allowing mutation
    user = request.user
    can_modify = (
        user.role in {Role.ADMIN, Role.ADMIN_USER}
        or ann.created_by == user
        or (user.role == Role.BRANCH_MANAGER and ann.branch == user.branch)
    )
    if not can_modify:
        return Response({"detail": "Permission denied."}, status=403)

    if request.method == "PATCH":
        serializer = AnnouncementSerializer(ann, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    ann.delete()
    return Response(status=204)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def submit_help_request(request):
    """Student sends a help request visible to their teacher."""
    # Fix #5: students only
    if request.user.role != Role.STUDENT:
        return Response({"detail": "Students only."}, status=403)

    from apps.enrollments.models import Enrollment
    from apps.scenarios.models import Question

    enrollment = Enrollment.objects.filter(user=request.user).order_by("-created_at").first()
    if not enrollment:
        return Response({"detail": "Not enrolled."}, status=404)

    question_id = request.data.get("question_id")
    question = None
    if question_id:
        try:
            question = Question.objects.get(pk=question_id)
        except Question.DoesNotExist:
            pass

    HelpRequest.objects.create(
        enrollment=enrollment,
        question=question,
        message=request.data.get("message", "")[:500],
    )
    return Response({"detail": "Help request submitted."})


@api_view(["GET"])
@permission_classes([IsTeacherOrAbove])
def teacher_help_requests(request, instance_id):
    """Teacher inbox for a given instance."""
    from apps.instances.models import Instance
    try:
        instance = Instance.objects.get(pk=instance_id)
    except Instance.DoesNotExist:
        return Response(status=404)

    # Fix #6: verify the requesting user has access to this instance
    user = request.user
    has_access = (
        user.role in {Role.ADMIN, Role.ADMIN_USER}
        or instance in user.assigned_instances.all()
        or (user.role == Role.BRANCH_MANAGER and instance.branch == user.branch)
    )
    if not has_access:
        return Response(status=403)

    reqs = HelpRequest.objects.filter(
        enrollment__instance=instance,
        resolved_at__isnull=True,
    ).select_related("enrollment__user", "question").order_by("-created_at")

    return Response([{
        "id": r.id,
        "student": r.enrollment.user.username,
        "question": r.question.title if r.question else None,
        "message": r.message,
        "created_at": r.created_at.isoformat(),
    } for r in reqs])


def sse_exam_events(request):
    """
    GET /api/sse/exam-events/
    Server-Sent Events stream — pushes pause state + announcements every 4s.
    """
    # Fix #1: require authentication before opening the stream
    if not request.user.is_authenticated:
        from django.http import HttpResponse
        return HttpResponse(status=401)

    def event_stream():
        from apps.core.models import AppConfig
        from apps.instances.models import Instance, InstanceStatus

        enrollment = None
        if request.user.role == Role.STUDENT:
            from apps.enrollments.models import Enrollment
            enrollment = Enrollment.objects.filter(user=request.user).order_by("-created_at").first()

        # Fix #2: cap at 3600 iterations (~4 h) so stale connections self-terminate;
        # wrap in try/except to handle client disconnects cleanly.
        try:
            for _ in range(3600):
                cfg = AppConfig.get()
                paused = cfg.exam_global_paused

                if enrollment:
                    try:
                        inst = Instance.objects.get(pk=enrollment.instance_id)
                        if inst.status == InstanceStatus.PAUSED:
                            paused = True
                    except Exception:
                        pass

                now = timezone.now()
                from django.db.models import Q
                anns = list(
                    Announcement.objects.filter(
                        is_active=True
                    ).filter(
                        Q(expires_at__isnull=True) | Q(expires_at__gt=now)
                    ).filter(scope="global").values("id", "title", "message", "severity")[:3]
                )

                payload = json.dumps({"paused": paused, "announcements": anns})
                yield f"data: {payload}\n\n"
                time.sleep(4)
        except (GeneratorExit, BrokenPipeError, Exception):
            return

    response = StreamingHttpResponse(event_stream(), content_type="text/event-stream")
    response["X-Accel-Buffering"] = "no"
    response["Cache-Control"] = "no-cache"
    return response
