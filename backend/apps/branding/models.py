"""BrandKit model — full management UI in Phase 2."""
from django.db import models


class BrandKit(models.Model):
    name = models.CharField(max_length=120, unique=True)
    brand_name = models.CharField(max_length=120, default="KERNELiOS")
    site_title = models.CharField(max_length=120, default="KERNELiOS — Advanced Simulator")
    tagline = models.CharField(max_length=255, blank=True)

    # Colours (hex strings including #)
    color_surface = models.CharField(max_length=9, default="#07080b")
    color_primary = models.CharField(max_length=9, default="#ffd700")
    color_primary_glow = models.CharField(max_length=9, default="#ffee58")
    color_secondary = models.CharField(max_length=9, default="#4b0082")
    color_accent = models.CharField(max_length=9, default="#ff3d00")
    color_foreground = models.CharField(max_length=9, default="#f4f4f5")
    color_muted = models.CharField(max_length=9, default="#a1a1aa")
    color_border = models.CharField(max_length=9, default="#27272a")
    color_scrollbar = models.CharField(max_length=9, default="#ffd700")

    # Logos (header, footer, email, favicon) — URL or file upload
    logo_url = models.URLField(blank=True, default="", help_text="Main header logo URL")
    logo_file = models.ImageField(upload_to="brand-kits/logos/", null=True, blank=True)
    footer_logo_url = models.URLField(blank=True, default="", help_text="Optional footer logo")
    footer_logo_file = models.ImageField(upload_to="brand-kits/logos/", null=True, blank=True)
    favicon_url = models.URLField(blank=True, default="")
    favicon_file = models.ImageField(upload_to="brand-kits/favicons/", null=True, blank=True)
    email_header_logo_url = models.URLField(blank=True, default="")
    email_header_logo_file = models.ImageField(upload_to="brand-kits/logos/", null=True, blank=True)

    # Custom CSS injected into <head> for power-users
    custom_css = models.TextField(blank=True, default="", help_text="Custom CSS overrides")

    # Per-kit Moodle integration (overrides global AppConfig settings)
    moodle_base_url = models.URLField(blank=True, default="", help_text="Override global Moodle URL (optional)")
    moodle_token = models.CharField(max_length=128, blank=True, default="", help_text="Override global Moodle token (optional)")

    # Per-kit SMTP / email (overrides global)
    smtp_host = models.CharField(max_length=255, blank=True, default="")
    smtp_port = models.PositiveIntegerField(null=True, blank=True)
    smtp_user = models.CharField(max_length=255, blank=True, default="")
    smtp_password = models.CharField(max_length=255, blank=True, default="")
    smtp_from_email = models.EmailField(blank=True, default="")
    smtp_use_tls = models.BooleanField(default=True)

    # Fonts — Google Fonts name (e.g. "Orbitron") OR woff2 upload
    font_display_family = models.CharField(max_length=120, default="Orbitron")
    font_display_url = models.URLField(blank=True, default="")
    font_display_file = models.FileField(upload_to="brand-kits/fonts/", null=True, blank=True)
    font_body_family = models.CharField(max_length=120, default="Inter")
    font_body_url = models.URLField(blank=True, default="")
    font_body_file = models.FileField(upload_to="brand-kits/fonts/", null=True, blank=True)
    font_mono_family = models.CharField(max_length=120, default="JetBrains Mono")

    # Country association (ISO 3166-1 alpha-2 codes, comma-separated)
    country_codes = models.CharField(
        max_length=500,
        blank=True,
        default="",
        help_text='Comma-separated ISO country codes, e.g. "IL,US,DE"',
    )

    is_default = models.BooleanField(default=False, db_index=True)
    created_by = models.ForeignKey(
        "accounts.User",
        null=True,
        on_delete=models.SET_NULL,
        related_name="brand_kits",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-is_default", "name"]

    def __str__(self) -> str:
        return f"{self.name}{'  [DEFAULT]' if self.is_default else ''}"

    def country_code_list(self) -> list[str]:
        return [c.strip().upper() for c in self.country_codes.split(",") if c.strip()]

    def to_css_vars(self) -> dict[str, str]:
        """Returns a mapping of CSS variable name → value for the BrandKitProvider."""
        return {
            "--brand-name": self.brand_name,
            "--surface": self.color_surface,
            "--primary": self.color_primary,
            "--primary-glow": self.color_primary_glow,
            "--secondary": self.color_secondary,
            "--accent": self.color_accent,
            "--foreground": self.color_foreground,
            "--muted": self.color_muted,
            "--border": self.color_border,
            "--scrollbar": self.color_scrollbar,
            "--font-display": f'"{self.font_display_family}", ui-sans-serif, sans-serif',
            "--font-body": f'"{self.font_body_family}", ui-sans-serif, sans-serif',
            "--font-mono": f'"{self.font_mono_family}", ui-monospace, monospace',
        }
