"""
KERNELiOS email service — brand-kit-aware SMTP sending.
Reads credentials from AppConfig singleton at send time (no restart required).
"""
from __future__ import annotations

import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import TYPE_CHECKING


def _get_config():
    from apps.core.models import AppConfig
    return AppConfig.get()


def send_email(
    to: str | list[str],
    subject: str,
    html_body: str,
    text_body: str = "",
    brand_kit=None,
) -> tuple[bool, str]:
    """
    Send an email using the SMTP credentials stored in AppConfig.
    Returns (success: bool, message: str).
    """
    cfg = _get_config()

    if not cfg.smtp_host or not cfg.smtp_user:
        return False, "SMTP not configured — set host and user in Settings."

    recipients = [to] if isinstance(to, str) else to

    # Inject brand-kit header into HTML if provided
    header_html = ""
    if brand_kit and brand_kit.email_header_logo_url:
        color = brand_kit.color_primary
        name = brand_kit.brand_name
        logo = brand_kit.email_header_logo_url
        header_html = f"""
        <div style="background:{brand_kit.color_surface};padding:20px;text-align:center;border-bottom:2px solid {color}">
          <img src="{logo}" alt="{name}" style="height:40px;width:auto;" />
          <p style="color:{color};font-family:monospace;font-size:12px;margin:4px 0 0;letter-spacing:0.2em;text-transform:uppercase">
            {name}
          </p>
        </div>
        """
    elif brand_kit:
        color = brand_kit.color_primary
        name = brand_kit.brand_name
        header_html = f"""
        <div style="background:{brand_kit.color_surface};padding:20px;text-align:center;border-bottom:2px solid {color}">
          <p style="color:{color};font-family:monospace;font-size:18px;font-weight:bold;letter-spacing:0.3em;text-transform:uppercase;margin:0">
            {name}
          </p>
        </div>
        """

    full_html = f"""<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0d0f14;color:#f4f4f5;font-family:Arial,sans-serif;">
{header_html}
<div style="max-width:600px;margin:0 auto;padding:32px 24px;">
{html_body}
</div>
<div style="border-top:1px solid #27272a;margin:32px 24px 0;padding:16px 0;text-align:center;">
<p style="color:#71717a;font-family:monospace;font-size:10px;letter-spacing:0.2em;text-transform:uppercase;margin:0">
  © {brand_kit.brand_name if brand_kit else 'KERNELiOS'} &nbsp;·&nbsp; Confidential
</p>
</div>
</body>
</html>"""

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = cfg.smtp_from_email or cfg.smtp_user
    msg["To"] = ", ".join(recipients)

    if text_body:
        msg.attach(MIMEText(text_body, "plain", "utf-8"))
    msg.attach(MIMEText(full_html, "html", "utf-8"))

    try:
        if cfg.smtp_use_tls:
            server = smtplib.SMTP(cfg.smtp_host, cfg.smtp_port, timeout=10)
            server.starttls()
        else:
            server = smtplib.SMTP_SSL(cfg.smtp_host, cfg.smtp_port, timeout=10)
        server.login(cfg.smtp_user, cfg.smtp_password)
        server.sendmail(msg["From"], recipients, msg.as_string())
        server.quit()
        return True, f"Email sent to {', '.join(recipients)}."
    except Exception as exc:
        return False, f"SMTP error: {exc}"


def send_moodle_import_welcome(user, plain_password: str = "Exam1234") -> None:
    """Send welcome email to a Moodle-imported user with their temporary credentials."""
    from apps.branding.models import BrandKit
    try:
        kit = BrandKit.objects.get(is_default=True)
    except Exception:
        kit = None

    html = f"""
<h2 style="color:#ffd700;font-family:monospace;letter-spacing:0.1em">WELCOME TO THE EXAM SYSTEM</h2>
<p>Your account has been created. Use the credentials below to log in.</p>
<table style="border-collapse:collapse;margin:16px 0">
  <tr>
    <td style="padding:8px 16px 8px 0;color:#a1a1aa;font-family:monospace">Username</td>
    <td style="padding:8px;background:#1c1f27;font-family:monospace;color:#ffd700">{user.username}</td>
  </tr>
  <tr>
    <td style="padding:8px 16px 8px 0;color:#a1a1aa;font-family:monospace">Temporary Password</td>
    <td style="padding:8px;background:#1c1f27;font-family:monospace;color:#ff3d00">{plain_password}</td>
  </tr>
</table>
<p style="color:#ff3d00;font-family:monospace;font-size:12px">
  ⚠ You will be required to change your password on first login.
</p>
"""
    send_email(user.email, "Your KERNELiOS Exam Account", html, brand_kit=kit)
