from django.urls import path
from . import views

app_name = "enrollments"

urlpatterns = [
    path("state/", views.exam_state, name="state"),
    path("start/", views.start_exam, name="start"),
    path("submit-test/", views.submit_test, name="submit-test"),
    path("view/<int:question_id>/", views.view_question, name="view-question"),
    path("submit/<int:question_id>/", views.submit_answer, name="submit"),
    path("hint/<int:question_id>/", views.use_hint, name="hint"),
    path("scoreboard/<int:instance_id>/", views.scoreboard, name="scoreboard"),
    path("progress/", views.student_progress, name="progress"),
]
