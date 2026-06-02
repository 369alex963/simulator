from django.urls import path
from . import views

app_name = "branches"

urlpatterns = [
    path("", views.branch_list, name="list"),
    path("<int:pk>/", views.branch_detail, name="detail"),
]
