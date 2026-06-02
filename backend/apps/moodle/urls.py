from django.urls import path
from . import views

app_name = "moodle"

urlpatterns = [
    path("course-users/", views.course_users_preview, name="course-users"),
    path("import/", views.import_course, name="import"),
    path("push-grades/<int:instance_id>/", views.push_grades, name="push-grades"),
]
