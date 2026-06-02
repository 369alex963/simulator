from django.urls import path
from . import views

app_name = "scenarios"

urlpatterns = [
    path("", views.scenario_list, name="list"),
    path("<int:pk>/", views.scenario_detail, name="detail"),
    path("<int:scenario_pk>/questions/", views.question_list, name="question-list"),
    path("<int:scenario_pk>/questions/<int:pk>/", views.question_detail, name="question-detail"),
    path("<int:scenario_pk>/scoring-rules/", views.scoring_rules, name="scoring-rules"),
    path("<int:scenario_pk>/import-csv/", views.scenario_csv_import, name="csv-import"),
    path("<int:scenario_pk>/export-csv/", views.scenario_csv_export, name="csv-export"),
    path("<int:scenario_pk>/export-json/", views.scenario_json_export, name="json-export"),
]
