from django.urls import path
from . import views

app_name = "audit"

urlpatterns = [
    path("logs/", views.audit_log_list, name="audit-list"),
    path("security/", views.security_log_list, name="security-list"),
]
