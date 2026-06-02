from rest_framework import serializers
from .models import BrandKit


def _abs(request, file_field) -> str | None:
    if not file_field:
        return None
    if request:
        return request.build_absolute_uri(file_field.url)
    return file_field.url


# Fields safe to expose to unauthenticated callers (the /api/brand/resolve/ endpoint).
# Never includes credentials (smtp_password, moodle_token, smtp_user, etc.).
PUBLIC_VISUAL_FIELDS = [
    "id", "name", "brand_name", "site_title", "tagline",
    "color_surface", "color_primary", "color_primary_glow",
    "color_secondary", "color_accent", "color_foreground",
    "color_muted", "color_border", "color_scrollbar",
    "logo_url", "footer_logo_url", "favicon_url", "email_header_logo_url",
    "logo", "footer_logo", "favicon", "email_header_logo",
    "font_display_family", "font_display_url",
    "font_body_family", "font_body_url",
    "font_mono_family",
    "custom_css",
    "country_codes", "is_default",
    "css_vars", "google_fonts_url",
    "created_at", "updated_at",
]


class PublicBrandKitSerializer(serializers.ModelSerializer):
    """Safe for unauthenticated callers — no credentials."""
    css_vars = serializers.SerializerMethodField()
    logo = serializers.SerializerMethodField()
    footer_logo = serializers.SerializerMethodField()
    favicon = serializers.SerializerMethodField()
    email_header_logo = serializers.SerializerMethodField()
    google_fonts_url = serializers.SerializerMethodField()

    class Meta:
        model = BrandKit
        fields = PUBLIC_VISUAL_FIELDS
        read_only_fields = PUBLIC_VISUAL_FIELDS

    def get_css_vars(self, obj: BrandKit) -> dict:
        return obj.to_css_vars()

    def get_logo(self, obj: BrandKit) -> str | None:
        request = self.context.get("request")
        return _abs(request, obj.logo_file) or obj.logo_url or None

    def get_footer_logo(self, obj: BrandKit) -> str | None:
        request = self.context.get("request")
        return _abs(request, obj.footer_logo_file) or obj.footer_logo_url or None

    def get_favicon(self, obj: BrandKit) -> str | None:
        request = self.context.get("request")
        return _abs(request, obj.favicon_file) or obj.favicon_url or None

    def get_email_header_logo(self, obj: BrandKit) -> str | None:
        request = self.context.get("request")
        return _abs(request, obj.email_header_logo_file) or obj.email_header_logo_url or None

    def get_google_fonts_url(self, obj: BrandKit) -> str:
        families = []
        if obj.font_display_family and not obj.font_display_url:
            families.append(obj.font_display_family.replace(" ", "+") + ":wght@500;600;700;800")
        if obj.font_body_family and not obj.font_body_url:
            families.append(obj.font_body_family.replace(" ", "+") + ":wght@400;500;600;700")
        if obj.font_mono_family and obj.font_mono_family not in ("JetBrains Mono", "monospace"):
            families.append(obj.font_mono_family.replace(" ", "+") + ":wght@400;500;700")
        if not families:
            return ""
        params = "&".join(f"family={f}" for f in families)
        return f"https://fonts.googleapis.com/css2?{params}&display=swap"


class BrandKitSerializer(PublicBrandKitSerializer):
    """Full serializer for authenticated admin use — includes integration settings."""
    # Credentials are write-only: never returned in GET responses
    smtp_password = serializers.CharField(write_only=True, required=False, allow_blank=True)
    moodle_token = serializers.CharField(write_only=True, required=False, allow_blank=True)
    # Reveal whether credentials are set (safe boolean)
    smtp_password_set = serializers.SerializerMethodField()
    moodle_token_set = serializers.SerializerMethodField()

    class Meta(PublicBrandKitSerializer.Meta):
        fields = PUBLIC_VISUAL_FIELDS + [
            "moodle_base_url", "moodle_token", "moodle_token_set",
            "smtp_host", "smtp_port", "smtp_user", "smtp_password", "smtp_password_set",
            "smtp_from_email", "smtp_use_tls",
        ]
        read_only_fields = ["id", "created_at", "updated_at",
                            "logo", "footer_logo", "favicon", "email_header_logo",
                            "smtp_password_set", "moodle_token_set"]

    def get_smtp_password_set(self, obj: BrandKit) -> bool:
        return bool(obj.smtp_password)

    def get_moodle_token_set(self, obj: BrandKit) -> bool:
        return bool(obj.moodle_token)


class BrandKitListSerializer(serializers.ModelSerializer):
    logo = serializers.SerializerMethodField()

    class Meta:
        model = BrandKit
        fields = ["id", "name", "brand_name", "color_primary", "is_default", "country_codes", "logo"]

    def get_logo(self, obj: BrandKit) -> str | None:
        request = self.context.get("request") if hasattr(self, "context") else None
        return _abs(request, obj.logo_file) or obj.logo_url or None


class BrandKitCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = BrandKit
        fields = [
            "name", "brand_name", "site_title", "tagline",
            "color_surface", "color_primary", "color_primary_glow",
            "color_secondary", "color_accent", "color_foreground",
            "color_muted", "color_border", "color_scrollbar",
            "logo_url", "footer_logo_url", "favicon_url", "email_header_logo_url",
            "font_display_family", "font_display_url",
            "font_body_family", "font_body_url", "font_mono_family",
            "custom_css",
            "moodle_base_url", "moodle_token",
            "smtp_host", "smtp_port", "smtp_user", "smtp_password",
            "smtp_from_email", "smtp_use_tls",
            "country_codes", "is_default",
        ]
