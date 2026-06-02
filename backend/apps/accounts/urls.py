from django.urls import path
from . import views

app_name = "accounts"

urlpatterns = [
    path("login/", views.login_view, name="login"),
    path("logout/", views.logout_view, name="logout"),
    path("me/", views.me_view, name="me"),
    path("onboarding/seen/", views.mark_onboarding_seen, name="onboarding-seen"),
    path("change-password/", views.change_password_view, name="change-password"),
    path("register/", views.register_view, name="register"),
    path("password-reset/request/", views.password_reset_request, name="password-reset-request"),
    path("password-reset/confirm/", views.password_reset_confirm, name="password-reset-confirm"),
]
