"""
Moodle REST client — token-based Web Services API.
Uses AppConfig for base URL + token (set in Admin → Settings).
"""
from __future__ import annotations
import os
import secrets
import requests
from typing import Any

from django.conf import settings


def _cfg():
    from apps.core.models import AppConfig
    return AppConfig.get()


def _call(function: str, **params) -> Any:
    cfg = _cfg()
    if not cfg.moodle_base_url or not cfg.moodle_token:
        raise RuntimeError("Moodle is not configured. Set base URL and token in Settings.")

    url = cfg.moodle_base_url.rstrip("/") + "/webservice/rest/server.php"
    resp = requests.post(
        url,
        data={
            "wstoken": cfg.moodle_token,
            "moodlewsrestformat": "json",
            "wsfunction": function,
            **params,
        },
        timeout=15,
    )
    resp.raise_for_status()
    data = resp.json()
    if isinstance(data, dict) and "exception" in data:
        raise RuntimeError(f"Moodle error: {data.get('message', data)}")
    return data


def get_course_users(course_id: int) -> list[dict]:
    """Returns list of enrolled users in a course."""
    return _call("core_enrol_get_enrolled_users", courseid=course_id)


def push_grade(enrollment) -> None:
    """Push a student's score to Moodle gradebook."""
    if not enrollment.user.moodle_user_id:
        return
    instance = enrollment.instance
    if not instance.moodle_course_id:
        return
    _call(
        "core_grades_update_grades",
        source="KERNELiOS",
        courseid=int(instance.moodle_course_id),
        component="mod_assign",
        activityid=0,
        itemnumber=0,
        grades__0__studentid=int(enrollment.user.moodle_user_id),
        grades__0__grade=float(enrollment.score_total),
    )


def import_course_users(course_id: int, branch, instance=None, created_by=None) -> list:
    """
    Import all enrolled students from a Moodle course.
    Returns list of created/updated User objects.
    """
    from django.contrib.auth.hashers import make_password
    from apps.accounts.models import Role, User

    moodle_users = get_course_users(course_id)
    created = []

    for mu in moodle_users:
        moodle_id = str(mu.get("id", ""))
        email = mu.get("email", "").strip()
        username = mu.get("username", "").strip()
        first = mu.get("firstname", "")
        last = mu.get("lastname", "")

        if not email or not username:
            continue

        user, was_created = User.objects.get_or_create(
            moodle_user_id=moodle_id,
            defaults={
                "username": username,
                "email": email,
                "first_name": first,
                "last_name": last,
                "role": Role.STUDENT,
                "branch": branch,
                "created_via": "moodle",
                "must_change_password": True,
            },
        )
        if was_created:
            # TODO: send welcome email containing temp_password to user.email
            temp_password = secrets.token_urlsafe(12)
            user.set_password(temp_password)
            user.save()

        if instance:
            from apps.enrollments.models import Enrollment
            Enrollment.objects.get_or_create(
                user=user,
                instance=instance,
                defaults={"inherited_branch": branch},
            )

        created.append(user)

    return created
