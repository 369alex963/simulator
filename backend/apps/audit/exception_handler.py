"""Custom DRF exception handler that logs 403 permission denials to SecurityLog."""
from rest_framework.views import exception_handler as drf_exception_handler
from rest_framework.exceptions import PermissionDenied, NotAuthenticated


def audit_exception_handler(exc, context):
    response = drf_exception_handler(exc, context)

    if isinstance(exc, (PermissionDenied, NotAuthenticated)) and response is not None:
        try:
            from .recorder import log_security
            request = context.get("request")
            log_security(
                event_type="permission_denied",
                severity="warn",
                request=request,
                details={
                    "path": request.path if request else "",
                    "method": request.method if request else "",
                    "detail": str(exc),
                },
            )
        except Exception:
            pass

    return response
