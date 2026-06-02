"""DRF permission classes used across all apps."""
from rest_framework.permissions import BasePermission
from .models import Role


class IsAdminLevel(BasePermission):
    """admin or admin_user."""
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role in {Role.ADMIN, Role.ADMIN_USER}
        )


class IsBranchManagerOrAbove(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role in {Role.ADMIN, Role.ADMIN_USER, Role.BRANCH_MANAGER}
        )


class IsTeacherOrAbove(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role in {Role.ADMIN, Role.ADMIN_USER, Role.BRANCH_MANAGER, Role.TEACHER}
        )


class IsStudent(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == Role.STUDENT
        )


class IsAuthenticated(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)
