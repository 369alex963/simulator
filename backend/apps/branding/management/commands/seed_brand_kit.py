"""
python manage.py seed_brand_kit
Creates the default KERNELiOS HQ gold/dark brand-kit if it doesn't exist.
"""
from django.core.management.base import BaseCommand
from apps.branding.models import BrandKit
from apps.accounts.models import User


class Command(BaseCommand):
    help = "Seed the default KERNELiOS brand-kit."

    def handle(self, *args, **options):
        if BrandKit.objects.filter(is_default=True).exists():
            self.stdout.write("Default brand-kit already exists.")
            return

        admin = User.objects.filter(is_super_admin=True).first()

        BrandKit.objects.create(
            name="KERNELiOS Default",
            brand_name="KERNELiOS",
            site_title="KERNELiOS — Advanced Simulator System",
            tagline="Cyber Exam & Simulation Grid",
            color_surface="#07080b",
            color_primary="#ffd700",
            color_primary_glow="#ffee58",
            color_secondary="#4b0082",
            color_accent="#ff3d00",
            color_foreground="#f4f4f5",
            color_muted="#a1a1aa",
            color_border="#27272a",
            color_scrollbar="#ffd700",
            font_display_family="Orbitron",
            font_body_family="Inter",
            font_mono_family="JetBrains Mono",
            is_default=True,
            created_by=admin,
        )
        self.stdout.write(self.style.SUCCESS("Default brand-kit created."))
