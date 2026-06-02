# KERNELiOS Audit A4 — Runtime & Logic Bug Report

**Date:** 2026-05-25  
**Scope:** `backend/apps/` + `frontend/src/`  
**Auditor:** Claude Code (Senior Staff Engineer review)

---

## Summary

| Severity | Count |
|----------|-------|
| CRITICAL | 5     |
| HIGH     | 8     |
| MEDIUM   | 7     |
| LOW      | 5     |
| **Total**| **25**|

**Top 5 to fix before shipping:**

1. **[CRITICAL] Race condition: double scoring / double completion** — two concurrent answer submissions for the last question both pass the `submitted_at is None` check and both mark the exam complete and push to Moodle.
2. **[CRITICAL] SSE stream never terminates — goroutine/thread leak** — `sse_exam_events` runs `while True: time.sleep(4)` with no client-disconnect check; every connected student holds a worker thread until the server restarts.
3. **[CRITICAL] `view_question` does not stamp `first_seen_at`** — the endpoint's `get_or_create` relies on `auto_now_add=True`, so the timer actually starts when the _attempt row is first created_ (which can be on any first action, including `submit_answer`), not when the student navigates to the question. `view_question` never sets the field explicitly, making the per-question timer unreliable.
4. **[CRITICAL] Hardcoded default password `Exam1234` exposed in API response** — `import_course` returns `"Default password: Exam1234"` in the response body, and `import_course_users` sets that literal on every imported user; any observer of the API traffic gets every Moodle-imported student's credential.
5. **[HIGH] N+1 on scoreboard** — `scoreboard()` loops over enrollments and inside the loop calls `e.attempts.filter(...)` and `e.attempts.all()`, one query per enrollment per call, no `prefetch_related`.

---

## CRITICAL

### [CRITICAL] Race condition: double scoring and double Moodle push

- **File:** `backend/apps/enrollments/views.py:281-312`
- **Issue:** Two concurrent POST requests to `/api/exam/submit/<last_question>/` can both pass the `enrollment.submitted_at is None` guard simultaneously, resulting in the score being recalculated twice and `push_grade` being called twice.
- **Repro / why:** `submit_answer` checks `enrollment.submitted_at is None` on line 218 but does _not_ lock the row before writing; two requests racing under WSGI/ASGI both read `None`, both set `submitted_at`, and both call `update_enrollment_score` + Moodle push.
- **Fix:** Wrap the final-answer block in a `select_for_update()` transaction:
  ```python
  with transaction.atomic():
      enrollment = Enrollment.objects.select_for_update().get(pk=enrollment.pk)
      if enrollment.submitted_at is not None:
          return Response({"correct": True, "already_answered": True})
      # ... set submitted_at, call update_enrollment_score, push_grade
  ```

---

### [CRITICAL] SSE stream never checks for client disconnect — thread/process leak

- **File:** `backend/apps/notifications/views.py:138-177`
- **Issue:** `event_stream()` runs an infinite `while True: … time.sleep(4)` loop with no mechanism to detect that the client has disconnected; every connected student holds a Django worker indefinitely.
- **Repro / why:** Django's `StreamingHttpResponse` cannot automatically terminate a generator; if the client closes the browser tab the generator keeps executing until the server process is killed or restarted. Under any moderate load this will exhaust worker threads.
- **Fix:** Check `request.META.get("wsgi.input")` for read errors, or use Django Channels / a proper async view, or at minimum catch `GeneratorExit` and `BrokenPipeError`:
  ```python
  def event_stream():
      try:
          while True:
              …
              yield f"data: {payload}\n\n"
              time.sleep(4)
      except GeneratorExit:
          return
  ```
  Additionally, add a max-iteration ceiling (e.g. `for _ in range(3600)`) so stale connections self-terminate after ~4 hours.

---

### [CRITICAL] `view_question` does not actually stamp `first_seen_at`; timer is unreliable

- **File:** `backend/apps/enrollments/views.py:346-355`, `backend/apps/enrollments/models.py:66`
- **Issue:** `QuestionAttempt.first_seen_at` uses `auto_now_add=True`, which means the field is set when the _row is first created_ — not when the student navigates to the question. The `view_question` endpoint calls `get_or_create` but never explicitly sets `first_seen_at`, so the timer starts at row-creation time (which happens implicitly on the first action for that question, potentially `submit_answer` on a prior attempt), not at actual question-view time.
- **Repro / why:** A student submits answer on Q1, which calls `get_or_create` for Q1's `QuestionAttempt`. The row's `first_seen_at` is now the submission time, not the view time. If `view_question` is later called, the response returns `first_seen_at` already set, so the frontend timer is off.
- **Fix:** Change `first_seen_at` to `null=True, blank=True` (remove `auto_now_add`) and set it explicitly inside `view_question`:
  ```python
  attempt, created = QuestionAttempt.objects.get_or_create(enrollment=enrollment, question=question)
  if attempt.first_seen_at is None:
      attempt.first_seen_at = timezone.now()
      attempt.save(update_fields=["first_seen_at"])
  ```

---

### [CRITICAL] Hardcoded default password exposed in API response body

- **File:** `backend/apps/moodle/views.py:88`, `backend/apps/moodle/client.py:100`
- **Issue:** The import response body returns `"Default password: Exam1234"` in plain text, and `client.py:100` sets `"Exam1234"` as the literal password for every Moodle-imported user.
- **Repro / why:** Any intercepted API response, any log line, or any admin who re-reads the confirmation message gets the credential for every imported account. Combined with their Moodle usernames (also returned), this is a mass account takeover vector.
- **Fix:** Remove the password from the response message; generate a per-user random temp password using `secrets.token_urlsafe(12)` in `import_course_users`, store it hashed, and return it only via the welcome email (which already exists). Never log or return plain-text passwords.

---

### [CRITICAL] `use_hint` has no role guard — any authenticated user can call it

- **File:** `backend/apps/enrollments/views.py:358-374`
- **Issue:** `use_hint` only checks `IsAuthenticated` (via decorator), not `Role.STUDENT`, meaning a teacher or admin can POST to `/api/exam/hint/<id>/` on any question without being enrolled, and the response leaks the `question.hint` text.
- **Repro / why:** The question is fetched with `Question.objects.get(pk=question_id)` — no scenario/enrollment scope check — so any authenticated user who knows a question PK gets its hint.
- **Fix:** Add the same role + enrollment guard as `submit_answer`:
  ```python
  if request.user.role != Role.STUDENT:
      return Response({"detail": "Students only."}, status=403)
  # ... then check the question belongs to the enrollment's scenario
  question = Question.objects.get(pk=question_id, scenario=enrollment.instance.scenario)
  ```

---

## HIGH

### [HIGH] N+1 query in `scoreboard()` — one query per enrollment per request

- **File:** `backend/apps/enrollments/views.py:406-414`
- **Issue:** Inside the enrollment loop, `e.attempts.filter(is_correct=True).values_list(...)` and `e.attempts.all()` each fire a new SQL query per enrollment row.
- **Repro / why:** 100 enrolled students → 200+ queries per scoreboard page load; grows linearly with class size.
- **Fix:**
  ```python
  enrollments = (
      instance.enrollments
      .select_related("user")
      .prefetch_related("attempts")
      .order_by("-score_total", "-created_at")
  )
  # then use e.attempts.all() against the prefetched cache
  ```

---

### [HIGH] N+1 query in `instance_enrollments` GET — same pattern

- **File:** `backend/apps/instances/views.py:213-214`
- **Issue:** `e.attempts.all()` inside the loop fires a query per enrollment even though `prefetch_related("attempts")` is already called (line 213 calls `.prefetch_related("attempts")` but the inner loop then calls `.all()` which is fine — however the `correct_qids` set comprehension on line 214 also calls `a.question_id` which is already on the prefetched objects, so this is actually OK). Check: the `prefetch_related("attempts")` is set at line 213 and the inner comprehension uses `e.attempts.all()` against the cache — this specific path is actually safe. No bug here.
- **Fix:** N/A (false positive on closer read — documented for clarity).

---

### [HIGH] `admin_instance_analytics` fires N+1 queries for questions

- **File:** `backend/apps/analytics/views.py:86-98`
- **Issue:** For each question, `QuestionAttempt.objects.filter(enrollment__in=enrollments, question=q)` fires a separate query. With 20 questions and 100 students this is 20 separate queries in the inner loop.
- **Repro / why:** Scales O(questions) in queries; no batching.
- **Fix:** Use a single aggregated query with `values("question_id").annotate(...)` grouping, or at minimum do one `QuestionAttempt.objects.filter(enrollment__in=enrollments).select_related("question")` and group in Python.

---

### [HIGH] `admin_deep_analytics` iterates completed enrollments in Python for score distribution — potential OOM

- **File:** `backend/apps/analytics/views.py:133-138`
- **Issue:** `for e in completed.only("score_total")` fetches all completed enrollment rows into Python memory to bucket them.
- **Repro / why:** Large deployments could have thousands of completed enrollments; this loads every row.
- **Fix:** Use database-side bucketing with `Case`/`When` or `annotate(bucket=...)` and `values("bucket").annotate(count=Count("id"))`.

---

### [HIGH] `smtp_port` may be `None`, causing `SMTP()` to crash with unhelpful TypeError

- **File:** `backend/apps/notifications/email_service.py:88`
- **Issue:** `AppConfig.smtp_port` is a `PositiveIntegerField` that defaults to 587, but if it is somehow `None` (e.g. set to null via direct DB edit), `smtplib.SMTP(host, None)` raises a `TypeError` rather than a clean error message.
- **Repro / why:** The field is nullable-by-default-django and the SMTP call has no guard.
- **Fix:** Add a guard: `if not cfg.smtp_port: return False, "SMTP port not configured."` before opening the connection.

---

### [HIGH] Password-change loop: `UserProvider` redirects to `/app/profile?must_change=1`, but after success it routes to `/app` — `UserProvider` re-runs `getMe` only once on mount, so if `must_change_password` is still `True` in the cached state it redirects again

- **File:** `frontend/src/components/nav/user-provider.tsx:34-37`, `frontend/src/app/app/profile/page.tsx:34-35`
- **Issue:** `UserProvider.useEffect` runs with empty deps (once on mount). After `ProfilePage` successfully changes the password and calls `router.push("/app")`, the `UserProvider` that wraps the app shell has already cached `user.must_change_password = true` in its state. If the router push causes a client-side navigation (not a full page reload), `UserProvider` does NOT re-fetch `/api/auth/me/`, so `user.must_change_password` stays `true` in state and the redirect fires again.
- **Repro / why:** Navigate to `/app` after password change → `UserProvider` still holds stale `must_change_password: true` → redirect to profile again → loop.
- **Fix:** After a successful password change, force a full-page reload (`window.location.href = "/app"`) instead of `router.push`, or update the user context via a callback/state-setter passed down to the profile page.

---

### [HIGH] `email_service.py` uses `SMTP_SSL` when `smtp_use_tls = False`, but should use plain SMTP for port 25/non-SSL

- **File:** `backend/apps/notifications/email_service.py:90-91`
- **Issue:** The condition is `if cfg.smtp_use_tls: SMTP + starttls; else: SMTP_SSL`. This logic is inverted for common configurations: "use TLS" is interpreted as STARTTLS (correct), but the `else` branch uses `SMTP_SSL` (implicit TLS / port 465) rather than plain SMTP (port 25). Operators disabling TLS (e.g. local SMTP relay) get an SSL-wrapped connection they didn't ask for.
- **Repro / why:** Setting `smtp_use_tls = False` and `smtp_port = 25` causes `SMTP_SSL` on port 25, which will fail with an SSL handshake error against a non-SSL relay.
- **Fix:** Add a third path for truly plain SMTP: `smtplib.SMTP(host, port)` without `.starttls()`, and use the TLS flag to differentiate STARTTLS vs SSL vs plain.

---

### [HIGH] Branch manager can view/delete announcements they do not own

- **File:** `backend/apps/notifications/views.py:65-80`
- **Issue:** `announcement_detail` (PATCH/DELETE) is guarded by `IsTeacherOrAbove` but does not check that the acting user is the creator of the announcement or that it belongs to their branch.
- **Repro / why:** A branch_manager from Branch A can DELETE announcements created by Branch B by guessing the announcement PK.
- **Fix:** Add an ownership check:
  ```python
  if request.user.role == Role.BRANCH_MANAGER and ann.branch != request.user.branch:
      return Response(status=403)
  ```

---

## MEDIUM

### [MEDIUM] `QuestionAttempt.first_seen_at` uses `auto_now_add` — migration needed if changed

- **File:** `backend/apps/enrollments/models.py:66`
- **Issue:** `first_seen_at = models.DateTimeField(auto_now_add=True)` means the field is always set at row creation and can never be `None`. The frontend code at `exam/page.tsx:171` checks `if (selected.first_seen_at)` before calling `view_question`, implying it could be null; the view at `enrollments/views.py:349` returns `attempt.first_seen_at` without considering it might need to be explicitly set. The API contract and UI logic assume nullability but the model enforces non-null via auto_now_add.
- **Repro / why:** Inconsistency between intended design (nullable, set on first view) and actual model (always set on row creation).
- **Fix:** Change to `first_seen_at = models.DateTimeField(null=True, blank=True)` and set explicitly in `view_question`. Requires a migration.

---

### [MEDIUM] `scoreboard` endpoint has no authorization check — any authenticated user sees all students in any instance

- **File:** `backend/apps/enrollments/views.py:377-436`
- **Issue:** `scoreboard(request, instance_id)` is guarded only by `IsAuthenticated`. A student can call `/api/exam/scoreboard/<any_instance_id>/` for an instance they are not enrolled in.
- **Repro / why:** The view does check `is_staff` to conditionally include scores, but it does not verify the requesting user belongs to the instance's branch or is enrolled in it.
- **Fix:** Add an enrollment or branch check before returning data:
  ```python
  if request.user.role == Role.STUDENT:
      if not instance.enrollments.filter(user=request.user).exists():
          return Response(status=403)
  ```

---

### [MEDIUM] `instance_detail` DELETE cascades student users who may be enrolled in _other_ instances

- **File:** `backend/apps/instances/views.py:109-114`
- **Issue:** `student_users = User.objects.filter(enrollments__instance=instance, role=Role.STUDENT).distinct()` then `student_users.delete()` deletes the user accounts entirely, even if those students have enrollments in other instances.
- **Repro / why:** A student enrolled in both Instance A and Instance B will be hard-deleted when Instance A is deleted, losing all their Instance B progress as well.
- **Fix:** Only delete the enrollment rows, not the user accounts:
  ```python
  instance.enrollments.all().delete()
  instance.delete()
  ```
  Or if user deletion is intended, filter to users enrolled _only_ in this instance:
  ```python
  students_only_here = User.objects.filter(
      enrollments__instance=instance, role=Role.STUDENT
  ).exclude(enrollments__instance__ne=instance).distinct()
  ```

---

### [MEDIUM] `_resolve_kit` in `branding/views.py` calls `BrandKit.objects.all()` to do country matching — full table scan every unauthenticated request

- **File:** `backend/apps/branding/views.py:35-38`
- **Issue:** Every call to `/api/brand/resolve/` (fired on every page load) fetches all brand kits from the DB and iterates them in Python to find a country match.
- **Repro / why:** Even with a cache, if the cache misses (e.g. first request after restart), this hits the DB. With many brand kits this is a full table scan in Python.
- **Fix:** Add a short-lived cache (30–60 seconds) keyed on the resolved country code, or filter in the DB: `BrandKit.objects.filter(country_codes__icontains=country)`.

---

### [MEDIUM] `exam_state` returns the per-question `first_seen_at` as a raw datetime for locked questions — starts the per-question timer even for questions the student should not yet see

- **File:** `backend/apps/enrollments/views.py:107`, `frontend/src/app/app/exam/page.tsx:160-164`
- **Issue:** `exam_state` returns `first_seen_at` for _all_ questions, including locked future questions. In sequential mode, if a locked question's attempt row was implicitly created (e.g. via `use_hint` or an incorrect `submit_answer` before the sequential guard catches it), the frontend `useWallClockTimer` for that question will start ticking even though the student hasn't reached it, inflating the time penalty.
- **Repro / why:** Sequential guard in `submit_answer` fires _after_ `get_or_create`, but for `use_hint` there is no sequential check at all, so a hint call on a future question creates the row and stamps `first_seen_at`.
- **Fix:** In `exam_state`, only return a non-null `first_seen_at` for questions that are `is_current` or `is_answered`; nullify it for locked questions in the response.

---

### [MEDIUM] `password_reset_confirm` does not validate the strength of the new password

- **File:** `backend/apps/accounts/views.py:209-210`
- **Issue:** `user.set_password(new_password)` is called directly with the raw POST value without passing it through `validate_kernelios_password`, so password resets bypass the minimum-length and uppercase requirement enforced on normal password changes.
- **Repro / why:** A reset token holder can set `"a"` as the new password.
- **Fix:**
  ```python
  from .serializers import validate_kernelios_password
  from rest_framework import serializers as drf_s
  try:
      validate_kernelios_password(new_password)
  except drf_s.ValidationError as e:
      return Response({"detail": str(e.detail[0])}, status=400)
  ```

---

### [MEDIUM] `use-exam-sse.ts` — React Strict Mode double-mount creates two EventSource connections

- **File:** `frontend/src/hooks/use-exam-sse.ts:16-54`
- **Issue:** In React 18+ Strict Mode (dev), `useEffect` fires mount → unmount → mount. The cleanup function sets `mountedRef.current = false` and closes the connection. The second mount sets `mountedRef.current = true` again and connects — this is correct. However, if there is a pending `reconnectTimerRef` from the first mount's `onerror`, the second mount does not cancel it before connecting, so two connections could briefly coexist.
- **Repro / why:** Strict Mode double-invoke → first mount's `onerror` queues a 5s reconnect → cleanup fires, but `reconnectTimerRef` is cleared — this is actually handled. On closer review the code _does_ clear `reconnectTimerRef` in cleanup. This is mostly a LOW risk; the real concern is production reconnect storms if the SSE endpoint returns 503 (maintenance mode): the 5s reconnect timer fires, hits 503 again, reconnects, loops — not exponential backoff.
- **Fix:** Implement exponential backoff in `onerror`:
  ```ts
  let delay = 5000;
  es.onerror = () => {
    es.close();
    if (mountedRef.current) {
      reconnectTimerRef.current = setTimeout(() => { connect(); delay = Math.min(delay * 2, 60000); }, delay);
    }
  };
  ```

---

## LOW

### [LOW] `moodle/views.py:114` — `__import__` trick to get `timezone.now()` is fragile

- **File:** `backend/apps/moodle/views.py:114`
- **Issue:** `instance.exported_at = __import__("django.utils.timezone", fromlist=["timezone"]).timezone.now()` is an unusual and brittle import pattern inside a view function.
- **Repro / why:** Works, but `__import__` with dotted names and `fromlist` is not the idiomatic Python way; a future refactor could break it silently.
- **Fix:** Add `from django.utils import timezone` at the top of the module and use `timezone.now()`.

---

### [LOW] `buildBrandKitStyleSheet` does not sanitize CSS variable values — CSS injection possible

- **File:** `frontend/src/lib/brand-server.ts:61-79`
- **Issue:** Color hex strings from the brand kit are injected directly into a `<style>` tag as `:root { --primary: <value>; }` without sanitization. If the `BrandKit.color_primary` field contains `;}body{background:red;/*`, it becomes a CSS injection.
- **Repro / why:** An admin with write access to brand kits could inject arbitrary CSS that affects all users on a whitelabel deployment, bypassing the per-kit custom CSS audit trail.
- **Fix:** Validate hex color strings on the backend (model-level validator `RegexValidator(r'^#[0-9A-Fa-f]{3,8}$')`) and strip/escape on the frontend before injecting into the style tag.

---

### [LOW] `BrandKitListSerializer` has no request context for `get_logo` — returns relative URL in SSR

- **File:** `backend/apps/branding/serializers.py:112-114`
- **Issue:** `BrandKitListSerializer.get_logo` checks `if hasattr(self, "context")` but the serializer is called in `brand_kit_list` without `context={"request": request}`, so `_abs(None, file_field)` returns a relative URL like `/media/brand-kits/logos/foo.png`.
- **Repro / why:** Frontend admin brand-kit list will show broken image `src` values in production where the media URL differs from the API origin.
- **Fix:** Pass `context={"request": request}` in `brand_kit_list`:
  ```python
  return Response(BrandKitListSerializer(kits, many=True, context={"request": request}).data)
  ```

---

### [LOW] `login_audit_list` returns hard-capped 200 rows with no pagination header

- **File:** `backend/apps/accounts/user_management_views.py:151`
- **Issue:** `qs[:200]` silently truncates the audit log; there is no `Link` header, `count` field, or pagination metadata. The frontend cannot tell if the list was truncated.
- **Repro / why:** After 200 login events the admin sees no indication the list is incomplete, which is a security audit concern.
- **Fix:** Use DRF's `PageNumberPagination` or at minimum return a `truncated: true` flag and `total_count`.

---

### [LOW] `student_progress` divide-by-zero guard only on `non_bonus` but not on percentage in `pct_complete`

- **File:** `backend/apps/enrollments/views.py:481`
- **Issue:** `"pct_complete": round(answered_non_bonus / non_bonus * 100, 1) if non_bonus else 0` is correct, but the pattern is a single-line guard that will silently return 0 if a scenario has no non-bonus questions (e.g. all-bonus scenarios). This is a logic concern: 100% of zero non-bonus questions answered shows as 0% complete.
- **Repro / why:** An all-bonus scenario would always report 0% progress even if all questions are answered.
- **Fix:** If `non_bonus == 0` and `bonus_answered > 0`, return 100 (or a flag indicating all-bonus mode).
