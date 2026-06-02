from rest_framework.authentication import SessionAuthentication


class CsrfExemptSessionAuthentication(SessionAuthentication):
    """
    SessionAuthentication without CSRF enforcement.
    Safe because all API requests go through the Next.js proxy on the same
    origin, and CORS is locked to allowed origins in production.
    """
    def enforce_csrf(self, request):
        return  # no-op — skip CSRF check
