from django.urls import path
from . import views

app_name = "analytics"

urlpatterns = [
    path("admin-summary/", views.admin_summary, name="admin-summary"),
    path("branch-summary/", views.branch_summary, name="branch-summary"),
    path("teacher-summary/", views.teacher_summary, name="teacher-summary"),
    path("instance/<int:pk>/", views.admin_instance_analytics, name="instance-analytics"),
    path("admin-deep/", views.admin_deep_analytics, name="admin-deep"),
]
