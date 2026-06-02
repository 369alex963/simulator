# Audit A3 — RBAC Enforcement Review

**Date:** 2026-05-25  
**Scope:** `new-version/backend/apps/` — all views, serializers, permission classes  
**Auditor:** Code-Reviewer agent  

---

## 1. Endpoint Inventory

| Method | Path | permission_classes | Required Role | Queryset Scope Correct? | Notes |
|--------|------|--------------------|---------------|------------------------|-------|
| GET | /api/health/ | AllowAny | Anonymous | Y | Liveness only |
| GET | /api/brand/resolve/ | AllowAny | Anonymous | Y | Uses PublicBrandKitSerializer (no creds) |
| GET/PATCH | /api/settings/ | IsAdminLevel | admin/admin_user | Y | Returns moodle_token + smtp_password in plaintext — see F-3 |
| POST | /api/settings/maintenance/ | IsAdminLevel | admin/admin_user | Y | — |
| POST | /api/settings/pause/ | IsAdminLevel | admin/admin_user | Y | — |
| POST | /api/settings/test-email/ | IsAdminLevel | admin/admin_user | Y | — |
| POST | /api/auth/login/ | AllowAny | Anonymous | Y | Throttled |
| POST | /api/auth/logout/ | IsAuthenticated | Any authenticated | Y | — |
| GET | /api/auth/me/ | IsAuthenticated | Any authenticated | Y | Own user only |
| POST | /api/auth/onboarding/seen/ | IsAuthenticated | Any authenticated | Y | Own user only |
| POST | /api/auth/change-password/ | IsAuthenticated | Any authenticated | Y | Own user only |
| POST | /api/auth/register/ | AllowAny | Anonymous | Y | Student self-register, throttled |
| POST | /api/auth/password-reset/request/ | AllowAny | Anonymous | Y | Throttled, no email enumeration |
| POST | /api/auth/password-reset/confirm/ | AllowAny | Anonymous | Y | Token-gated |
| GET/POST | /api/users/ | IsBranchManagerOrAbove | branch_manager+ | Y | Branch manager filtered to own branch |
| GET/PATCH/DELETE | /api/users/{pk}/ | IsBranchManagerOrAbove | branch_manager+ | Y (partial) | role/branch PATCH partially protected — see F-1 |
| POST | /api/users/{pk}/reset-password/ | IsAdminLevel | admin/admin_user | Y | — |
| GET | /api/audit-log/ | IsAdminLevel | admin/admin_user | Y | Login audit only |
| GET/POST | /api/branches/ | IsAdminLevel | admin/admin_user | Y | — |
| GET/PATCH/DELETE | /api/branches/{pk}/ | IsAdminLevel | admin/admin_user | Y | HQ branch protected |
| GET | /api/brand/kits/ | IsAdminLevel | admin/admin_user | Y | — |
| POST | /api/brand/kits/ | IsAdminLevel | admin/admin_user | Y | — |
| GET/PATCH/DELETE | /api/brand/kits/{pk}/ | IsAdminLevel | admin/admin_user | Y | — |
| POST | /api/brand/kits/{pk}/upload-logo/ | IsAdminLevel | admin/admin_user | Y | File type validated |
| POST | /api/brand/kits/{pk}/set-default/ | IsAdminLevel | admin/admin_user | Y | — |
| POST | /api/brand/kits/{pk}/attach/ | IsAdminLevel | admin/admin_user | Y | — |
| GET/POST | /api/scenarios/ | IsAdminLevel | admin/admin_user | Y | — |
| GET/PATCH/DELETE | /api/scenarios/{pk}/ | IsAdminLevel | admin/admin_user | Y | — |
| GET/POST | /api/scenarios/{pk}/questions/ | IsAdminLevel | admin/admin_user | Y | — |
| GET/PATCH/DELETE | /api/scenarios/{pk}/questions/{pk}/ | IsAdminLevel | admin/admin_user | Y | — |
| GET/PATCH | /api/scenarios/{pk}/scoring-rules/ | IsAdminLevel | admin/admin_user | Y | — |
| POST | /api/scenarios/{pk}/import-csv/ | IsAdminLevel | admin/admin_user | Y | File validated |
| GET | /api/scenarios/{pk}/export-csv/ | IsAdminLevel | admin/admin_user | Y | — |
| GET | /api/scenarios/{pk}/export-json/ | IsAdminLevel | admin/admin_user | Y | Exports correct_answer — see F-4 |
| GET | /api/instances/open/ | AllowAny | Anonymous | Y | Only open+registration_open |
| GET | /api/instances/my-enrollments/ | IsAuthenticated | Any authenticated | Y | Scoped to request.user |
| POST | /api/instances/select/ | IsAuthenticated | Any authenticated | Y | Ownership checked on enrollment |
| GET/POST | /api/instances/ | IsBranchManagerOrAbove | branch_manager+ | Y | Branch manager filtered to own branch |
| GET/PATCH/DELETE | /api/instances/{pk}/ | IsBranchManagerOrAbove | branch_manager+ | Y | _instance_access() enforced |
| POST | /api/instances/{pk}/pause/ | IsTeacherOrAbove | teacher+ | Y | _instance_access() enforced |
| POST | /api/instances/{pk}/archive/ | IsBranchManagerOrAbove | branch_manager+ | Y | _instance_access() enforced |
| POST | /api/instances/{pk}/toggle-registration/ | IsBranchManagerOrAbove | branch_manager+ | Y | _instance_access() enforced |
| POST | /api/instances/{pk}/assign-teachers/ | IsAdminLevel | admin/admin_user | Y | Teachers constrained to instance.branch |
| GET/POST/DELETE | /api/instances/{pk}/enrollments/ | IsBranchManagerOrAbove | branch_manager+ | Y (partial) | DELETE un-enroll lacks branch check — see F-2 |
| GET | /api/exam/state/ | IsAuthenticated | student only (role-checked) | Y | Scoped to request.user enrollment |
| POST | /api/exam/start/ | IsAuthenticated | student only (role-checked) | Y | Scoped to request.user enrollment |
| POST | /api/exam/submit-test/ | IsAuthenticated | student only (role-checked) | Y | Scoped to request.user enrollment |
| POST | /api/exam/submit/{q}/ | IsAuthenticated | student only (role-checked) | Y | Scoped to request.user enrollment |
| POST | /api/exam/view/{q}/ | IsAuthenticated | student only (role-checked) | Y | Scoped to request.user enrollment |
| POST | /api/exam/hint/{q}/ | IsAuthenticated | Any authenticated | N | Missing student role-check — see F-5 |
| GET | /api/exam/scoreboard/{id}/ | IsAuthenticated | Any authenticated | N | No branch/ownership scope — see F-6 |
| GET | /api/exam/progress/ | IsAuthenticated | Any authenticated | N | No student role check — see F-7 |
| GET | /api/analytics/admin-summary/ | IsAdminLevel | admin/admin_user | Y | — |
| GET | /api/analytics/branch-summary/ | IsBranchManagerOrAbove | branch_manager+ | N | Admin user hits null branch — see F-8 |
| GET | /api/analytics/teacher-summary/ | IsTeacherOrAbove | teacher+ | Y | Role-branched correctly |
| GET | /api/analytics/instance/{pk}/ | IsAdminLevel | admin/admin_user | Y | — |
| GET | /api/analytics/admin-deep/ | IsAdminLevel | admin/admin_user | Y | — |
| GET | /api/exports/{pk}/csv/ | IsTeacherOrAbove | teacher+ | Y | _instance_access() enforced |
| GET | /api/exports/{pk}/xlsx/ | IsTeacherOrAbove | teacher+ | Y | _instance_access() enforced |
| GET | /api/exports/{pk}/pdf/ | IsTeacherOrAbove | teacher+ | Y | _instance_access() enforced |
| POST | /api/exports/{pk}/recalculate/ | IsTeacherOrAbove | teacher+ | Y | _instance_access() enforced |
| GET | /api/moodle/course-users/ | IsBranchManagerOrAbove | branch_manager+ | N | No branch-scope on Moodle query — see F-9 |
| POST | /api/moodle/import/ | IsBranchManagerOrAbove | branch_manager+ | Y | Branch forced for non-admin |
| POST | /api/moodle/push-grades/{id}/ | IsBranchManagerOrAbove | branch_manager+ | N | No _instance_access() check — see F-10 |
| GET/POST | /api/notifications/announcements/ | IsAuthenticated | Any authenticated | Y (partial) | POST role-checked inline; scope filters correct |
| PATCH/DELETE | /api/notifications/announcements/{pk}/ | IsTeacherOrAbove | teacher+ | N | No ownership/scope check — see F-11 |
| POST | /api/notifications/help-requests/ | IsAuthenticated | Any authenticated | N | No student-only guard; any role can submit — see F-12 |
| GET | /api/notifications/help-requests/{id}/ | IsTeacherOrAbove | teacher+ | N | No teacher-to-instance access check — see F-13 |
| GET | /api/notifications/sse/ | (none) | None | N | Plain Django view, no auth — see F-14 (CRITICAL) |
| GET | /api/audit/logs/ | IsAdminLevel | admin/admin_user | Y | — |
| GET | /api/audit/security/ | IsAdminLevel | admin/admin_user | Y | — |

---

## 2. Findings

### [CRITICAL] F-14: SSE endpoint has no authentication whatsoever

- **File:** `apps/notifications/views.py:134`
- **Issue:** `sse_exam_events` is a plain Django function with no `@api_view`, no `@permission_classes`, and no `@login_required` decorator — any anonymous visitor can open a persistent streaming connection.
- **Why it matters:** An unauthenticated attacker can hold unlimited SSE connections open, consuming server threads/memory and causing a resource exhaustion DoS; the stream also leaks global announcement content (title, message, severity) to unauthenticated users.
- **Fix:** Add `@login_required` (or wrap in a DRF view with `permission_classes=[IsAuthenticated]`) and return a 401/403 for unauthenticated callers before entering the generator loop. Also enforce a maximum connection duration or move to a WebSocket with proper auth.

---

### [CRITICAL] F-1: `role` and `is_active` are writable by branch_manager via PATCH /api/users/{pk}/

- **File:** `apps/accounts/user_management_views.py:76–102`, `apps/accounts/serializers.py:53–61`
- **Issue:** `UserDetailSerializer` does not mark `role` or `is_active` as `read_only_fields`; the only guard in the PATCH handler is blocking `admin`/`admin_user` target roles for branch managers, but `is_active` (enable/disable any user), `must_change_password`, and `moodle_user_id` are entirely unguarded writes for branch managers.
- **Why it matters:** A branch_manager can silently disable (`is_active=False`) any teacher or student in their branch, or set `must_change_password=True` to lock them out — all without admin knowledge or an audit event.
- **Fix:** In the PATCH handler, for `Role.BRANCH_MANAGER` callers, explicitly whitelist the fields they are permitted to change (`first_name`, `last_name`, `email`, `password`). Alternatively, introduce a `BranchManagerUserUpdateSerializer` with a restricted `fields` list and `read_only_fields = ["role", "is_active", "is_staff", "is_super_admin", "must_change_password"]`.

---

### [HIGH] F-2: Un-enroll DELETE `/api/instances/{pk}/enrollments/` has no branch scope check

- **File:** `apps/instances/views.py:263–264`
- **Issue:** The DELETE path of `instance_enrollments` calls `Enrollment.objects.filter(instance=instance, user_id__in=user_ids).delete()` without checking that the target users belong to the requesting branch_manager's branch.
- **Why it matters:** A branch_manager who has access to an instance (via `_instance_access`) can un-enroll student IDs that belong to other branches if those students happen to be enrolled in the same instance (e.g., a shared/HQ instance). This crosses the branch isolation boundary.
- **Fix:** Add a branch guard analogous to the POST path: if `request.user.role == Role.BRANCH_MANAGER`, filter `Enrollment.objects.filter(instance=instance, user_id__in=user_ids, user__branch=request.user.branch).delete()`.

---

### [HIGH] F-10: `push_grades` Moodle endpoint has no instance ownership check

- **File:** `apps/moodle/views.py:92–117`
- **Issue:** `push_grades` fetches the instance by `pk` and immediately pushes all completed enrollment grades to Moodle without calling `_instance_access()` to verify that the branch_manager owns this instance.
- **Why it matters:** Any branch_manager can trigger a Moodle grade-push for any instance in any branch, potentially corrupting grade data in another branch's Moodle course.
- **Fix:** After fetching the instance, add `if not _instance_access(request.user, instance): return Response(status=403)` (the same pattern used throughout `instances/views.py`).

---

### [HIGH] F-14 (secondary): `branch_summary` crashes (AttributeError) for admin/admin_user callers

- **File:** `apps/analytics/views.py:32–46` (finding tracked as F-8)
- **Issue:** `branch_summary` is gated by `IsBranchManagerOrAbove`, so admin and admin_user users can call it. The view immediately does `branch = user.branch` and then `branch.name` without a null guard — admins typically have `branch=None`, causing an `AttributeError` on `branch.name`.
- **Why it matters:** Although `"HQ"` is returned if branch is None for the `branch_name` key, the queryset `Enrollment.objects.filter(instance__branch=branch)` with `branch=None` returns enrollments where `instance__branch IS NULL`, which is silently wrong data — not all-branches data. An admin user gets a misleading empty or partial summary.
- **Fix:** For admin/admin_user callers, redirect to the `admin_summary` data or explicitly aggregate across all branches. For branch_manager, the current logic is correct.

---

### [HIGH] F-11: Announcement PATCH/DELETE has no ownership or scope check

- **File:** `apps/notifications/views.py:66–80`
- **Issue:** `announcement_detail` allows any `IsTeacherOrAbove` user to PATCH or DELETE any announcement regardless of who created it or which branch/instance it belongs to.
- **Why it matters:** A teacher in Branch A can delete a branch_manager's announcement for Branch B, or a branch_manager can delete system-wide admin announcements.
- **Fix:** Add an ownership or role-hierarchy check: require `ann.created_by == request.user` or `request.user.role in {Role.ADMIN, Role.ADMIN_USER}`. For branch_managers, also verify `ann.branch == request.user.branch` when `ann.scope == "branch"`.

---

### [MEDIUM] F-5: `use_hint` endpoint has no student-only role check

- **File:** `apps/enrollments/views.py:358–374`
- **Issue:** `use_hint` is gated by `IsAuthenticated` only and calls `_get_enrollment(request.user)` which returns `None` for non-students, correctly returning 404 — but it then fetches the question by `question_id` without tying it to `enrollment.instance.scenario`. A teacher or branch_manager with no enrollment will get 404, but the check relies on a side-effect rather than an explicit guard.
- **Why it matters:** Fragile defense; any future refactor that removes the enrollment lookup (or adds a fallback) would silently grant hint access to staff. Also, the question fetch on line 370 is `Question.objects.get(pk=question_id)` — not scoped to the enrollment's scenario — allowing a student to mark hints used on questions from other scenarios.
- **Fix:** Add `if request.user.role != Role.STUDENT: return Response(status=403)` at the top of the view (matching the pattern in `exam_state`, `start_exam`, `submit_answer`). Scope the question lookup: `Question.objects.get(pk=question_id, scenario=enrollment.instance.scenario)`.

---

### [MEDIUM] F-6: Scoreboard is reachable by any authenticated user for any instance

- **File:** `apps/enrollments/views.py:377–436`
- **Issue:** `scoreboard` is gated by `IsAuthenticated` only; any authenticated user (including a teacher in Branch B) can call `/api/exam/scoreboard/<id>/` for any instance in any branch and receive student usernames, status, timing data, and submission timestamps.
- **Why it matters:** Student progress data (names, completion status, time-on-task) for Branch A leaks to Branch B teachers. The `is_staff` check on line 389 correctly hides scores from students but the endpoint itself is cross-branch readable.
- **Fix:** Before returning data, verify the caller has access to the instance: `if not _instance_access(request.user, instance) and request.user.role != Role.STUDENT: return Response(status=403)`. For students, additionally verify they are enrolled in the requested instance.

---

### [MEDIUM] F-13: Teacher help-request inbox has no teacher-to-instance ownership check

- **File:** `apps/notifications/views.py:111–131`
- **Issue:** `teacher_help_requests` fetches help requests for any instance_id with only `IsTeacherOrAbove` as the gate — there is no call to `_instance_access()`.
- **Why it matters:** A teacher from Branch A can read student help messages from Branch B's instances, leaking student communication content.
- **Fix:** After fetching the instance, add `if not _instance_access(request.user, instance): return Response(status=403)`.

---

### [MEDIUM] F-3: AppConfig returns SMTP password and Moodle token in GET response (plaintext)

- **File:** `apps/core/settings_views.py:11–23`
- **Issue:** `AppConfigSerializer` includes `moodle_token` and `smtp_password` in its `fields` list without marking them `write_only=True`. A GET `/api/settings/` by any admin/admin_user returns these credentials in plaintext in the JSON response body.
- **Why it matters:** Credentials in GET responses are logged by reverse proxies, CDNs, browser devtools, and any audit middleware, dramatically widening the exposure window beyond just the database.
- **Fix:** Add `extra_kwargs = {"moodle_token": {"write_only": True}, "smtp_password": {"write_only": True}}` to the serializer Meta, and add corresponding boolean `*_set` fields (following the pattern already used in `BrandKitSerializer`). Front-end password inputs should use the `*_set` boolean to show a "configured" placeholder.

---

### [MEDIUM] F-9: Moodle course-users preview is not branch-scoped

- **File:** `apps/moodle/views.py:12–31`
- **Issue:** `course_users_preview` is gated by `IsBranchManagerOrAbove` and calls the Moodle API with any `course_id` supplied by the caller, returning all enrolled Moodle users for that course. There is no check that the Moodle course belongs to the branch_manager's branch.
- **Why it matters:** A branch_manager can enumerate users from any Moodle course on the connected Moodle server, including courses belonging to other branches, exposing PII (username, email) of users outside their scope.
- **Fix:** Because Moodle courses are not natively mapped to KERNELiOS branches, a practical mitigation is to restrict `course_users_preview` to `IsAdminLevel` only, or require the branch_manager to first associate a `moodle_course_id` with one of their own instances before previewing.

---

### [MEDIUM] F-7: `student_progress` has no student-only role guard

- **File:** `apps/enrollments/views.py:439–488`
- **Issue:** `student_progress` uses `IsAuthenticated` only. For non-student callers, `_get_enrollment(request.user)` returns `None` (404), but a teacher who happens to also be enrolled (e.g., was a student previously) would receive progress data — the intent is students-only.
- **Why it matters:** Relies on the absence of an enrollment record rather than an explicit role check, making it fragile and misleading in intent.
- **Fix:** Add `if request.user.role != Role.STUDENT: return Response({"detail": "Students only."}, status=403)` at the top of the view.

---

### [LOW] F-4: Scenario JSON export includes `correct_answer` for all admin_level users

- **File:** `apps/scenarios/views.py:280–308`
- **Issue:** `scenario_json_export` serializes and returns `correct_answer` for every question. This is intentional for scenario backup/migration but has no documentation comment noting the sensitivity.
- **Why it matters:** This file, if downloaded and shared or logged, directly hands exam answer keys to anyone with the download URL who is admin or admin_user. If the file ends up in a shared drive or email attachment it permanently exposes all answers.
- **Fix:** Add a clear docstring warning that this endpoint exports answer keys and should not be shared. Consider adding an `include_answers` query parameter that defaults to `false` and requires explicit opt-in, omitting `correct_answer` from the default export.

---

### [LOW] F-12: `submit_help_request` has no student-only guard

- **File:** `apps/notifications/views.py:83–107`
- **Issue:** `submit_help_request` accepts POSTs from any authenticated user. A teacher or branch_manager can submit help requests, which appear in the teacher inbox alongside student requests with no role label.
- **Why it matters:** Low severity — the help inbox would become confusing, and a staff user could DoS the inbox by flooding requests — but no data leak occurs.
- **Fix:** Add `if request.user.role != Role.STUDENT: return Response({"detail": "Students only."}, status=403)`.

---

### [LOW] F-15: `media` files always served regardless of `DEBUG` setting

- **File:** `kernelios/urls.py:45–46`
- **Issue:** The comment says "always served — brand-kit assets must work" and `settings.DEBUG or True` evaluates to `True` unconditionally, meaning Django's development `static()` URL pattern is active in production. Django's static file serving is intentionally single-threaded and unoptimized.
- **Why it matters:** Media uploads (logos, favicons) are served by the Django process in production, blocking request workers and bypassing any CDN caching headers that a proper web server (nginx/Cloudways) would set.
- **Fix:** Remove the `or True` override. Configure nginx to serve `MEDIA_ROOT` directly in production. If brand-kit assets must be served during development without a full nginx stack, keep only the `if settings.DEBUG:` guard.

---

## Serializer `read_only_fields` Summary

| Serializer | Field | Status |
|------------|-------|--------|
| UserDetailSerializer | `role` | WRITABLE — no read_only protection at serializer level; only partial view-layer guard |
| UserDetailSerializer | `is_active` | WRITABLE — no read_only protection |
| UserDetailSerializer | `is_super_admin` | read_only (correct) |
| UserDetailSerializer | `branch_id` | WRITABLE — branch managers partially blocked by view logic only |
| UserDetailSerializer | `password` | write_only (correct) |
| AppConfigSerializer | `smtp_password` | NOT write_only (finding F-3) |
| AppConfigSerializer | `moodle_token` | NOT write_only (finding F-3) |
| BrandKitSerializer | `smtp_password` | write_only (correct) |
| BrandKitSerializer | `moodle_token` | write_only (correct) |
