from django.urls import path
from . import views

app_name = "notifications"

urlpatterns = [
    path("announcements/", views.announcements, name="announcements"),
    path("announcements/<int:pk>/", views.announcement_detail, name="announcement-detail"),
    path("help-requests/", views.submit_help_request, name="help-request"),
    path("help-requests/<int:instance_id>/", views.teacher_help_requests, name="teacher-help"),
    path("sse/", views.sse_exam_events, name="sse"),
]
