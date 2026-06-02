"""
Brand-kit-aware PDF export using reportlab.
Generates a professional exam results report with the instance's brand colours.
"""
from __future__ import annotations

import io
from decimal import Decimal

from django.db.models import Avg
from django.utils import timezone


def _resolve_brand_kit_for(user, instance):
    """
    Pick the brand kit to theme the PDF with. Priority:
      1. The exporting user's own branch.brand_kit
      2. The instance's branch.brand_kit
      3. The default brand kit
    """
    candidates = []
    try:
        if user and getattr(user, "branch", None) and user.branch.brand_kit_id:
            candidates.append(user.branch.brand_kit)
    except Exception:
        pass
    try:
        if instance.branch.brand_kit_id:
            candidates.append(instance.branch.brand_kit)
    except Exception:
        pass
    try:
        from apps.branding.models import BrandKit
        default = BrandKit.objects.filter(is_default=True).first()
        if default:
            candidates.append(default)
    except Exception:
        pass
    return candidates[0] if candidates else None


def build_pdf(instance, mode: str = "full", exporter=None) -> bytes:
    """
    Returns PDF bytes for the given instance.
    mode: 'summary' | 'analytics' | 'full'
    exporter: the User who triggered the export — their brand kit themes the PDF.
    """
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import cm
        from reportlab.platypus import (
            SimpleDocTemplate, Table, TableStyle, Paragraph,
            Spacer, HRFlowable,
        )
        from reportlab.lib.colors import HexColor
    except ImportError:
        return b""  # reportlab not installed

    # Resolve brand kit — exporter's branch wins, then instance's, then default
    kit = _resolve_brand_kit_for(exporter, instance)
    primary_hex = (kit.color_primary if kit else None) or "#ffd700"
    bg_hex = (kit.color_surface if kit else None) or "#07080b"
    accent_hex = (kit.color_accent if kit else None) or "#ff3d00"
    fg_hex = (kit.color_foreground if kit else None) or "#f4f4f5"
    border_hex = (kit.color_border if kit else None) or "#27272a"
    muted_hex = (kit.color_muted if kit else None) or "#a1a1aa"

    PRIMARY = HexColor(primary_hex)
    DARK = HexColor(bg_hex if bg_hex.lower() != "#ffffff" else "#0d0f14")
    LIGHT_ROW = HexColor("#1c1f27")
    WHITE = HexColor(fg_hex)
    MUTED = HexColor(muted_hex)
    ACCENT = HexColor(accent_hex)
    BORDER = HexColor(border_hex)

    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        rightMargin=2 * cm,
        leftMargin=2 * cm,
        topMargin=2 * cm,
        bottomMargin=2 * cm,
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "Title", parent=styles["Title"],
        textColor=PRIMARY, fontSize=18, spaceAfter=6,
    )
    sub_style = ParagraphStyle(
        "Sub", parent=styles["Normal"],
        textColor=MUTED, fontSize=9, spaceAfter=16,
    )
    section_style = ParagraphStyle(
        "Section", parent=styles["Heading2"],
        textColor=PRIMARY, fontSize=12, spaceBefore=12, spaceAfter=6,
    )

    story = []

    # Header
    brand_name = (kit.brand_name if kit else None) or "KERNELiOS"
    site_title = (kit.site_title if kit else None) or "Advanced Simulator System"

    story.append(Paragraph(brand_name, title_style))
    story.append(Paragraph(site_title, ParagraphStyle(
        "Tag", parent=styles["Normal"], textColor=MUTED, fontSize=8, spaceAfter=4,
    )))
    story.append(Paragraph(f"<b>Exam Results — {instance.name}</b>", sub_style))
    story.append(Paragraph(
        f"Generated: {timezone.now().strftime('%Y-%m-%d %H:%M UTC')}  ·  Branch: {instance.branch.name}",
        sub_style,
    ))
    story.append(HRFlowable(width="100%", thickness=1, color=PRIMARY, spaceAfter=12))

    def _fmt_secs(total):
        if total is None or total == "":
            return "—"
        s = int(total)
        h, rem = divmod(s, 3600)
        m, ss = divmod(rem, 60)
        return f"{h}:{m:02d}:{ss:02d}" if h else f"{m}:{ss:02d}"

    def _table_style(has_alt_rows: bool = True) -> TableStyle:
        cmds = [
            ("BACKGROUND", (0, 0), (-1, 0), PRIMARY),
            ("TEXTCOLOR", (0, 0), (-1, 0), DARK),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, 0), 9),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [DARK, LIGHT_ROW] if has_alt_rows else [DARK]),
            ("TEXTCOLOR", (0, 1), (-1, -1), WHITE),
            ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
            ("FONTSIZE", (0, 1), (-1, -1), 8),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("LEFTPADDING", (0, 0), (-1, -1), 6),
            ("GRID", (0, 0), (-1, -1), 0.5, BORDER),
        ]
        return TableStyle(cmds)

    # ── Summary section ──────────────────────────────────────────────────
    if mode in ("summary", "full"):
        story.append(Paragraph("Student Results Summary", section_style))
        header = ["#", "Student", "Email", "Status", "Score", "Started", "Submitted", "Wall", "Active"]
        rows = [header]
        for i, e in enumerate(
            instance.enrollments.select_related("user").prefetch_related("attempts").order_by("-score_total"), 1
        ):
            wall = ""
            if e.started_at:
                end = e.submitted_at or e.completed_at
                if end:
                    wall = int((end - e.started_at).total_seconds())
            active = sum(a.active_seconds for a in e.attempts.all())
            rows.append([
                str(i),
                e.user.username,
                e.user.email or "—",
                e.status.replace("_", " ").upper(),
                f"{float(e.score_total):.1f}",
                e.started_at.strftime("%H:%M") if e.started_at else "—",
                e.submitted_at.strftime("%H:%M") if e.submitted_at else "—",
                _fmt_secs(wall) if wall != "" else "—",
                _fmt_secs(active),
            ])

        col_widths = [0.7*cm, 3*cm, 3.4*cm, 1.8*cm, 1.3*cm, 1.4*cm, 1.4*cm, 1.4*cm, 1.4*cm]
        t = Table(rows, colWidths=col_widths, repeatRows=1)
        t.setStyle(_table_style())
        story.append(t)
        story.append(Spacer(1, 0.5*cm))

    # ── Analytics section ────────────────────────────────────────────────
    if mode in ("analytics", "full"):
        story.append(Paragraph("Question Analytics", section_style))
        questions = instance.scenario.questions.order_by("order") if instance.scenario else []
        from apps.enrollments.models import QuestionAttempt
        aheader = ["Q#", "Title", "Type", "Bonus", "Pts", "Attempts", "Correct", "% OK", "Avg Time"]
        arows = [aheader]
        for q in questions:
            qs = QuestionAttempt.objects.filter(enrollment__instance=instance, question=q)
            total = qs.count()
            correct = qs.filter(is_correct=True).count()
            avg_t = float(qs.aggregate(v=Avg("active_seconds"))["v"] or 0)
            pct = f"{correct/total*100:.0f}%" if total else "—"
            arows.append([
                f"Q{q.order}",
                q.title[:30] + ("…" if len(q.title) > 30 else ""),
                q.question_type.replace("_", " "),
                "Yes" if q.is_bonus else "No",
                str(q.base_points),
                str(total),
                str(correct),
                pct,
                f"{avg_t:.0f}s",
            ])
        acol_widths = [0.8*cm, 4*cm, 2.2*cm, 1.2*cm, 0.8*cm, 1.5*cm, 1.2*cm, 1.2*cm, 1.5*cm]
        at = Table(arows, colWidths=acol_widths, repeatRows=1)
        at.setStyle(_table_style())
        story.append(at)

    # Footer
    story.append(Spacer(1, 1*cm))
    story.append(HRFlowable(width="100%", thickness=0.5, color=ACCENT))
    story.append(Paragraph(f"© {brand_name} — Confidential", sub_style))

    doc.build(story)
    return buf.getvalue()
