from django.urls import path
from . import views

app_name = "exports"

urlpatterns = [
    path("<int:pk>/csv/", views.export_csv, name="csv"),
    path("<int:pk>/xlsx/", views.export_xlsx, name="xlsx"),
    path("<int:pk>/pdf/", views.export_pdf, name="pdf"),
    path("<int:pk>/recalculate/", views.recalculate_scores, name="recalculate"),
]
