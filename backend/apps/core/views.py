from django.db import connection
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response


@api_view(["GET"])
@permission_classes([AllowAny])
def health(request):
    """Simple liveness check — returns 200 if Django + DB are up."""
    try:
        connection.ensure_connection()
        db_ok = True
    except Exception:
        db_ok = False

    return Response(
        {
            "status": "online",
            "system": "KERNELiOS",
            "version": "2.0.0",
            "db": "ok" if db_ok else "error",
        }
    )
