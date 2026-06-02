"""Full user CRUD, audit log, login-audit views."""
from django.db import transaction
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from apps.accounts.permissions import IsAdminLevel, IsBranchManagerOrAbove
from apps.branches.models import Branch
from .models import LoginAuditLog, Role, User
from .serializers import LoginAuditSerializer, UserDetailSerializer, UserMiniSerializer


@api_view(["GET", "POST"])
@permission_classes([IsBranchManagerOrAbove])
def user_list(request):
    requester = request.user

    if request.method == "GET":
        if requester.role in {Role.ADMIN, Role.ADMIN_USER}:
            qs = User.objects.select_related("branch").all()
        else:
            # Branch manager sees only own branch
            qs = User.objects.filter(branch=requester.branch).select_related("branch")

        role_filter = request.query_params.get("role")
        if role_filter:
            qs = qs.filter(role=role_filter)
        branch_filter = request.query_params.get("branch")
        if branch_filter and requester.role in {Role.ADMIN, Role.ADMIN_USER}:
            qs = qs.filter(branch_id=branch_filter)
        # ?created_via=moodle filters to Moodle-imported users
        created_via = request.query_params.get("created_via")
        if created_via:
            qs = qs.filter(created_via=created_via)
        # ?search=term — username or email contains
        search = request.query_params.get("search")
        if search:
            from django.db.models import Q
            qs = qs.filter(Q(username__icontains=search) | Q(email__icontains=search))

        return Response(UserDetailSerializer(qs.order_by("username"), many=True).data)

    # POST — create user
    data = request.data.copy()

    # Branch manager cannot pick branch — force their own
    if requester.role == Role.BRANCH_MANAGER:
        data["branch_id"] = requester.branch_id
        # Branch managers can only create teachers and students
        if data.get("role") not in {Role.TEACHER, Role.STUDENT}:
            return Response({"detail": "Branch managers can only create teachers and students."}, status=400)

    serializer = UserDetailSerializer(data=data)
    serializer.is_valid(raise_exception=True)
    user = serializer.save(created_via="manual")
    return Response(UserDetailSerializer(user).data, status=status.HTTP_201_CREATED)


@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([IsBranchManagerOrAbove])
def user_detail(request, pk):
    try:
        user = User.objects.select_related("branch").get(pk=pk)
    except User.DoesNotExist:
        return Response(status=404)

    requester = request.user

    # Branch manager — scoped to own branch
    if requester.role == Role.BRANCH_MANAGER and user.branch != requester.branch:
        return Response(status=403)

    if request.method == "GET":
        return Response(UserDetailSerializer(user).data)

    if request.method == "PATCH":
        data = request.data.copy()
        new_role = data.get("role")

        # Branch managers cannot set admin roles and cannot move users cross-branch
        if requester.role == Role.BRANCH_MANAGER:
            if new_role in {Role.ADMIN, Role.ADMIN_USER}:
                return Response({"detail": "Cannot set admin roles."}, status=403)
            # Strip branch_id — branch managers cannot move users to another branch
            data.pop("branch_id", None)
            data.pop("branch", None)
            # Branch managers may only update basic profile fields
            BRANCH_MANAGER_ALLOWED = {"first_name", "last_name", "email", "phone_number"}
            disallowed = set(data.keys()) - BRANCH_MANAGER_ALLOWED
            if disallowed:
                return Response(
                    {"detail": f"Branch managers cannot update: {', '.join(sorted(disallowed))}"},
                    status=403,
                )

        # admin_user cannot elevate to ADMIN (only super_admin can)
        if requester.role == Role.ADMIN_USER and new_role == Role.ADMIN:
            return Response({"detail": "Only the super-admin can grant admin role."}, status=403)

        # No one can edit a user who has equal or higher role (prevent lateral attacks)
        role_rank = {Role.ADMIN: 4, Role.ADMIN_USER: 3, Role.BRANCH_MANAGER: 2, Role.TEACHER: 1, Role.STUDENT: 0}
        requester_rank = role_rank.get(requester.role, 0)
        target_rank = role_rank.get(user.role, 0)
        if target_rank >= requester_rank and not requester.is_super_admin:
            return Response({"detail": "Cannot edit a user with equal or higher privileges."}, status=403)

        serializer = UserDetailSerializer(user, data=data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(UserDetailSerializer(user).data)

    # DELETE
    if user.is_super_admin:
        return Response({"detail": "The super-admin cannot be deleted."}, status=400)
    if requester.role == Role.BRANCH_MANAGER and user.role in {Role.ADMIN, Role.ADMIN_USER}:
        return Response(status=403)
    user.delete()
    return Response(status=204)


@api_view(["POST"])
@permission_classes([IsAdminLevel])
def admin_reset_password(request, pk):
    """Force-set a user's password and flag must_change_password."""
    import secrets as _secrets
    try:
        user = User.objects.get(pk=pk)
    except User.DoesNotExist:
        return Response(status=404)

    new_password = request.data.get("password")
    if not new_password:
        # Generate a secure random temp password if caller didn't provide one
        new_password = _secrets.token_urlsafe(12)
        generated = True
    else:
        generated = False

    user.set_password(new_password)
    user.must_change_password = True
    user.save(update_fields=["password", "must_change_password"])
    response_data = {"detail": "Password reset. User must change on next login."}
    if generated:
        # Return the generated password once so admin can relay it
        response_data["temp_password"] = new_password
    return Response(response_data)


@api_view(["GET"])
@permission_classes([IsAdminLevel])
def login_audit_list(request):
    qs = LoginAuditLog.objects.select_related("user").all()
    username = request.query_params.get("username")
    success = request.query_params.get("success")
    if username:
        qs = qs.filter(username_attempted__icontains=username)
    if success is not None:
        qs = qs.filter(success=success.lower() in {"1", "true", "yes"})
    return Response(LoginAuditSerializer(qs[:200], many=True).data)
