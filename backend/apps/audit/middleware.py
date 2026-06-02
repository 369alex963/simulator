"""
AuditMiddleware — stores current request on a thread-local so signals
can read IP / user-agent without passing the request through.
"""
import threading

_local = threading.local()


def get_current_request():
    return getattr(_local, "request", None)


class AuditMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        _local.request = request
        try:
            return self.get_response(request)
        finally:
            # Always clear — prevents stale actor attribution on thread reuse
            _local.request = None
