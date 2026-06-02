from django.urls import path
from . import views

app_name = "instances"

urlpatterns = [
    path("open/", views.open_instances, name="open"),
    path("my-enrollments/", views.my_enrollments, name="my-enrollments"),
    path("select/", views.select_enrollment, name="select"),
    path("", views.instance_list, name="list"),
    path("<int:pk>/", views.instance_detail, name="detail"),
    path("<int:pk>/pause/", views.instance_pause, name="pause"),
    path("<int:pk>/archive/", views.instance_archive, name="archive"),
    path("<int:pk>/toggle-registration/", views.instance_toggle_registration, name="toggle-registration"),
    path("<int:pk>/assign-teachers/", views.instance_assign_teachers, name="assign-teachers"),
    path("<int:pk>/enrollments/", views.instance_enrollments, name="enrollments"),
]
