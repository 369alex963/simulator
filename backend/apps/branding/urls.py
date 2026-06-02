from django.urls import path
from . import views

app_name = "branding"

urlpatterns = [
    path("resolve/", views.brand_resolve, name="resolve"),
    path("kits/", views.brand_kit_list, name="kit-list"),
    path("kits/<int:pk>/", views.brand_kit_detail, name="kit-detail"),
    path("kits/<int:pk>/upload-logo/", views.brand_kit_upload_logo, name="kit-upload-logo"),
    path("kits/<int:pk>/set-default/", views.brand_kit_set_default, name="kit-set-default"),
    path("kits/<int:pk>/attach/", views.brand_kit_attach, name="kit-attach"),
]
