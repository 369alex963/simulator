"""Auth endpoints: login, logout, me, change-password, register, password-reset."""
import secrets
from django.contrib.auth import authenticate, login, logout
from django.core.cache import cache
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from apps.branches.models import Branch
from .models import LoginAuditLog, Role, User
from .serializers import (
    ChangePasswordSerializer,
    StudentSelfRegisterSerializer,
    UserDetailSerializer,
    UserMiniSerializer,
)
from .throttles import LoginRateThrottle, PasswordResetRateThrottle, RegisterRateThrottle


def _get_client_ip(request) -> str:
    xff = request.META.get("HTTP_X_FORWARDED_FOR", "")
    if xff:
        return xff.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR", "")


def _get_country(request) -> str:
    # Cloudways/Cloudflare sets CF-IPCountry; fallback to cookie
    return (
        request.META.get("HTTP_CF_IPCOUNTRY", "")
        or request.COOKIES.get("kernelios_country", "")
    )


@api_view(["POST"])
@permission_classes([AllowAny])
@throttle_classes([LoginRateThrottle])
def login_view(request):
    username = request.data.get("username", "").strip()
    password = request.data.get("password", "")

    user = authenticate(request, username=username, password=password)
    ip = _get_client_ip(request)
    country = _get_country(request)

    success = user is not None and user.is_active

    LoginAuditLog.objects.create(
        user=user if success else None,
        username_attempted=username,
        ip_address=ip or None,
        country_code=country[:2] if country else "",
        user_agent=request.META.get("HTTP_USER_AGENT", "")[:255],
        success=success,
    )

    # Security log
    try:
        from apps.audit.recorder import log_security
        log_security(
            event_type="login_ok" if success else "login_fail",
            severity="info" if success else "warn",
            actor=user if success else None,
            actor_username=username,
            ip_address=ip or None,
            user_agent=request.META.get("HTTP_USER_AGENT", "")[:512],
            country_code=country[:2] if country else "",
            details={"username": username},
        )
    except Exception:
        pass

    if not success:
        return Response(
            {"detail": "Invalid credentials."},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    login(request, user)

    response = Response(UserMiniSerializer(user).data)

    # 30-day country cookie
    if country:
        response.set_cookie(
            "kernelios_country",
            country[:2],
            max_age=60 * 60 * 24 * 30,
            httponly=False,  # JS-readable so frontend can apply brand-kit before auth
            samesite="Lax",
        )

    return response


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def logout_view(request):
    try:
        from apps.audit.recorder import log_security
        log_security(event_type="logout", severity="info", request=request)
    except Exception:
        pass
    logout(request)
    return Response({"detail": "Logged out."})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def me_view(request):
    return Response(UserMiniSerializer(request.user).data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def mark_onboarding_seen(request):
    """Mark the current user as having completed the How-To walkthrough."""
    user = request.user
    if not user.has_seen_onboarding:
        user.has_seen_onboarding = True
        user.save(update_fields=["has_seen_onboarding"])
    return Response({"has_seen_onboarding": True})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def change_password_view(request):
    serializer = ChangePasswordSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    user = request.user
    if not user.check_password(serializer.validated_data["current_password"]):
        return Response(
            {"detail": "Current password is incorrect."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    user.set_password(serializer.validated_data["new_password"])
    user.must_change_password = False
    user.save(update_fields=["password", "must_change_password"])
    from django.contrib.auth import update_session_auth_hash
    update_session_auth_hash(request, user)

    try:
        from apps.audit.recorder import log_security
        log_security(event_type="password_change", severity="info", request=request)
    except Exception:
        pass

    return Response({"detail": "Password updated."})


@api_view(["POST"])
@permission_classes([AllowAny])
@throttle_classes([PasswordResetRateThrottle])
def password_reset_request(request):
    """Send a one-time reset token to the user's email. Token stored in cache for 1h."""
    email = (request.data.get("email") or "").strip().lower()
    try:
        user = User.objects.get(email__iexact=email, is_active=True)
    except User.DoesNotExist:
        # Don't reveal whether the email exists
        return Response({"detail": "If this email is registered you will receive a reset link shortly."})

    token = secrets.token_urlsafe(32)
    cache.set(f"pwd_reset:{token}", user.pk, timeout=3600)

    try:
        from apps.notifications.email_service import EmailService
        EmailService.send(
            to_email=user.email,
            subject="KERNELiOS — Password Reset Token",
            html_body=f"""
            <p>Hi {user.username},</p>
            <p>Your password reset token is:</p>
            <p style="font-size:1.4em;font-weight:bold;letter-spacing:0.1em;">{token}</p>
            <p>This token expires in 1 hour. Paste it on the recovery page to set a new password.</p>
            <p>If you did not request a reset, ignore this email.</p>
            """,
        )
    except Exception:
        pass  # silently fail so we don't leak info

    return Response({"detail": "If this email is registered you will receive a reset link shortly."})


@api_view(["POST"])
@permission_classes([AllowAny])
def password_reset_confirm(request):
    """Validate token and set new password."""
    token = (request.data.get("token") or "").strip()
    new_password = request.data.get("new_password", "")

    if not token or not new_password:
        return Response({"detail": "Token and new_password are required."}, status=status.HTTP_400_BAD_REQUEST)

    cache_key = f"pwd_reset:{token}"
    user_id = cache.get(cache_key)
    if not user_id:
        return Response({"detail": "Invalid or expired token."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        user = User.objects.get(pk=user_id, is_active=True)
    except User.DoesNotExist:
        return Response({"detail": "Invalid or expired token."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        from .serializers import validate_kernelios_password
        validate_kernelios_password(new_password)
    except Exception as e:
        return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    user.set_password(new_password)
    user.must_change_password = False
    user.save(update_fields=["password", "must_change_password"])
    cache.delete(cache_key)

    return Response({"detail": "Password has been reset successfully."})


@api_view(["POST"])
@permission_classes([AllowAny])
@throttle_classes([RegisterRateThrottle])
def register_view(request):
    """Student self-registration. Instance must be open for registration."""
    from apps.instances.models import Instance  # avoid circular at module level

    serializer = StudentSelfRegisterSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    data = serializer.validated_data

    try:
        instance = Instance.objects.select_related("branch").get(
            id=data["instance_id"],
            status="open",
            registration_open=True,
        )
    except Instance.DoesNotExist:
        return Response(
            {"detail": "Instance not found or registration is closed."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Check registration deadline
    if instance.registration_closes_at and instance.registration_closes_at < timezone.now():
        return Response(
            {"detail": "Registration deadline has passed."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    user = User.objects.create(
        username=data["username"],
        email=data["email"],
        role=Role.STUDENT,
        branch=instance.branch,
        created_via="self_register",
    )
    user.set_password(data["password"])
    user.save()

    # Auto-enroll in the instance
    from apps.enrollments.models import Enrollment
    Enrollment.objects.create(user=user, instance=instance, inherited_branch=instance.branch)

    login(request, user)
    return Response(UserMiniSerializer(user).data, status=status.HTTP_201_CREATED)
