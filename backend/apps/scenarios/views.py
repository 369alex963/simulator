"""Scenario + Question + ScoringRules CRUD (admin/admin_user only for write)."""
import csv
import io

from django.db import transaction
from rest_framework import serializers as drf_serializers
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.parsers import MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.accounts.permissions import IsAdminLevel, IsTeacherOrAbove
from .models import Question, Scenario, ScoringRules
from .serializers import (
    QuestionSerializer,
    ScenarioDetailSerializer,
    ScenarioListSerializer,
    ScoringRulesSerializer,
)


# ── Scenarios ────────────────────────────────────────────────────────────────

@api_view(["GET", "POST"])
@permission_classes([IsAdminLevel])
def scenario_list(request):
    if request.method == "GET":
        qs = Scenario.objects.all()
        return Response(ScenarioListSerializer(qs, many=True).data)

    serializer = ScenarioDetailSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    scenario = serializer.save(created_by=request.user)
    # Auto-create ScoringRules
    ScoringRules.objects.get_or_create(scenario=scenario)
    return Response(ScenarioDetailSerializer(scenario).data, status=status.HTTP_201_CREATED)


@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([IsAdminLevel])
def scenario_detail(request, pk):
    try:
        scenario = Scenario.objects.get(pk=pk)
    except Scenario.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    if request.method == "GET":
        return Response(ScenarioDetailSerializer(scenario).data)

    if request.method == "PATCH":
        serializer = ScenarioDetailSerializer(scenario, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(ScenarioDetailSerializer(scenario).data)

    # Hard delete — scenarios are never archived (per spec).
    # Will cascade-delete questions; instances referencing this scenario must be moved/closed first.
    from apps.instances.models import Instance
    active_instances = Instance.objects.filter(scenario=scenario).exclude(status="archived")
    if active_instances.exists():
        return Response(
            {"detail": f"Cannot delete: {active_instances.count()} active instance(s) use this scenario. Close or archive them first."},
            status=status.HTTP_409_CONFLICT,
        )
    scenario.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


# ── Questions ────────────────────────────────────────────────────────────────

@api_view(["GET", "POST"])
@permission_classes([IsAdminLevel])
def question_list(request, scenario_pk):
    try:
        scenario = Scenario.objects.get(pk=scenario_pk)
    except Scenario.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    if request.method == "GET":
        return Response(QuestionSerializer(scenario.questions.all(), many=True).data)

    serializer = QuestionSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    # Validate total points cap (hard 100)
    existing_total = float(
        sum(q.base_points for q in scenario.questions.filter(is_bonus=False))
    )
    new_points = float(serializer.validated_data["base_points"])
    if not serializer.validated_data.get("is_bonus") and existing_total + new_points > 100:
        return Response(
            {"detail": f"Adding this question would exceed the 100-point base cap (current: {existing_total})."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    question = serializer.save(scenario=scenario)
    return Response(QuestionSerializer(question).data, status=status.HTTP_201_CREATED)


@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([IsAdminLevel])
def question_detail(request, scenario_pk, pk):
    try:
        question = Question.objects.get(pk=pk, scenario_id=scenario_pk)
    except Question.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    if request.method == "GET":
        return Response(QuestionSerializer(question).data)

    if request.method == "PATCH":
        serializer = QuestionSerializer(question, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(QuestionSerializer(question).data)

    question.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


# ── Scoring Rules ────────────────────────────────────────────────────────────

@api_view(["GET", "PATCH"])
@permission_classes([IsAdminLevel])
def scoring_rules(request, scenario_pk):
    try:
        rules, _ = ScoringRules.objects.get_or_create(scenario_id=scenario_pk)
    except Exception:
        return Response(status=status.HTTP_404_NOT_FOUND)

    if request.method == "GET":
        return Response(ScoringRulesSerializer(rules).data)

    serializer = ScoringRulesSerializer(rules, data=request.data, partial=True)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(ScoringRulesSerializer(rules).data)


# ── CSV Import ───────────────────────────────────────────────────────────────

@api_view(["POST"])
@permission_classes([IsAdminLevel])
@parser_classes([MultiPartParser])
def scenario_csv_import(request, scenario_pk):
    """
    POST /api/scenarios/<id>/import-csv/
    CSV format: order,title,prompt,type,is_bonus,base_points,correct_answer,choices,hint
    choices is pipe-separated, e.g. "A|B|C|D"
    """
    try:
        scenario = Scenario.objects.get(pk=scenario_pk)
    except Scenario.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    upload = request.FILES.get("file")
    if not upload:
        return Response({"detail": "No file."}, status=status.HTTP_400_BAD_REQUEST)

    # Validate file size and type
    if upload.size > 5 * 1024 * 1024:
        return Response({"detail": "File too large. Maximum 5 MB."}, status=status.HTTP_400_BAD_REQUEST)
    import os as _os
    ext = _os.path.splitext(upload.name)[1].lower()
    if ext not in {".csv", ".txt"}:
        return Response({"detail": "Only CSV files are accepted."}, status=status.HTTP_400_BAD_REQUEST)

    preview = request.query_params.get("preview") == "1"
    rows = []
    errors = []

    text = upload.read().decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(text))

    VALID_TYPES = {"text", "multiple_choice", "true_false"}

    def get_ci(row: dict, key: str, default: str = "") -> str:
        """Case-insensitive column lookup, trimmed."""
        for k, v in row.items():
            if k and k.strip().lower() == key:
                return (v or "").strip() if isinstance(v, str) else (v if v is not None else default)
        return default

    for i, row in enumerate(reader, start=2):
        # Skip completely blank rows
        if not row or not any((v or "").strip() if isinstance(v, str) else v for v in row.values()):
            continue
        try:
            order_raw = get_ci(row, "order")
            if not order_raw:
                continue  # ignore lines with no order
            qtype = (get_ci(row, "type") or "text").lower()
            if qtype not in VALID_TYPES:
                errors.append(f"Row {i}: invalid type '{qtype}' (use: {', '.join(sorted(VALID_TYPES))})")
                continue
            is_bonus = str(get_ci(row, "is_bonus")).lower() in {"1", "true", "yes"}
            choices_raw = get_ci(row, "choices")
            choices = [c.strip() for c in choices_raw.split("|") if c.strip()] if choices_raw else None
            base_pts_raw = get_ci(row, "base_points") or "5"
            rows.append({
                "order": int(order_raw),
                "title": get_ci(row, "title"),
                "prompt": get_ci(row, "prompt"),
                "question_type": qtype,
                "is_bonus": is_bonus,
                "base_points": float(base_pts_raw),
                "correct_answer": get_ci(row, "correct_answer"),
                "choices": choices,
                "hint": get_ci(row, "hint"),
            })
        except Exception as e:
            errors.append(f"Row {i}: {e}")

    if len(rows) > 500:
        return Response({"errors": ["Too many rows. Maximum 500 questions per CSV import."]},
                        status=status.HTTP_400_BAD_REQUEST)

    if errors:
        return Response({"errors": errors}, status=status.HTTP_400_BAD_REQUEST)

    # Hard cap: 100 base points for non-bonus questions (combined with existing non-overwritten)
    incoming_orders = {r["order"] for r in rows}
    keep_existing = sum(
        float(q.base_points)
        for q in scenario.questions.filter(is_bonus=False).exclude(order__in=incoming_orders)
    )
    incoming_non_bonus = sum(float(r["base_points"]) for r in rows if not r["is_bonus"])
    total = keep_existing + incoming_non_bonus
    if total > 100:
        errors.append(
            f"Import would exceed 100-point cap. Total would be {total:.1f} "
            f"(existing kept: {keep_existing:.1f} + imported non-bonus: {incoming_non_bonus:.1f})."
        )
        return Response({"errors": errors}, status=status.HTTP_400_BAD_REQUEST)

    if preview:
        return Response({"rows": rows, "count": len(rows)})

    with transaction.atomic():
        for r in rows:
            Question.objects.update_or_create(
                scenario=scenario,
                order=r["order"],
                defaults=r,
            )

    return Response({"imported": len(rows)})


# ── CSV Export ───────────────────────────────────────────────────────────────

@api_view(["GET"])
@permission_classes([IsAdminLevel])
def scenario_csv_export(request, scenario_pk):
    """GET /api/scenarios/<id>/export-csv/ — round-trips with the CSV import format."""
    from django.http import HttpResponse
    try:
        scenario = Scenario.objects.get(pk=scenario_pk)
    except Scenario.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    import re as _re
    safe_name = _re.sub(r'[^\w\-]', '_', scenario.name)[:40]
    response = HttpResponse(content_type="text/csv")
    response["Content-Disposition"] = f'attachment; filename="scenario-{scenario.pk}-{safe_name}.csv"'
    writer = csv.writer(response)
    writer.writerow(["order", "title", "prompt", "type", "is_bonus", "base_points", "correct_answer", "choices", "hint"])
    for q in scenario.questions.all().order_by("order"):
        choices_str = "|".join(q.choices) if q.choices else ""
        writer.writerow([
            q.order, q.title, q.prompt, q.question_type,
            "1" if q.is_bonus else "0", float(q.base_points),
            q.correct_answer, choices_str, q.hint,
        ])
    return response


@api_view(["GET"])
@permission_classes([IsAdminLevel])
def scenario_json_export(request, scenario_pk):
    """GET /api/scenarios/<id>/export-json/ — full scenario incl. scoring rules."""
    from django.http import JsonResponse
    try:
        scenario = Scenario.objects.get(pk=scenario_pk)
    except Scenario.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    rules = getattr(scenario, "scoring_rules", None)
    data = {
        "name": scenario.name,
        "description": scenario.description,
        "allow_hints": scenario.allow_hints,
        "randomize_questions": scenario.randomize_questions,
        "sequential": scenario.sequential,
        "scoring_rules": ScoringRulesSerializer(rules).data if rules else None,
        "questions": [
            {
                "order": q.order, "title": q.title, "prompt": q.prompt,
                "question_type": q.question_type, "is_bonus": q.is_bonus,
                "base_points": float(q.base_points), "correct_answer": q.correct_answer,
                "choices": q.choices, "hint": q.hint, "explanation": q.explanation,
            } for q in scenario.questions.all().order_by("order")
        ],
    }
    response = JsonResponse(data, json_dumps_params={"indent": 2})
    response["Content-Disposition"] = f'attachment; filename="scenario-{scenario.pk}-export.json"'
    return response
