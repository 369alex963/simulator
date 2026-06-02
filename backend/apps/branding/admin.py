from django.contrib import admin
from .models import BrandKit


@admin.register(BrandKit)
class BrandKitAdmin(admin.ModelAdmin):
    list_display = ["name", "brand_name", "color_primary", "is_default", "country_codes"]
    list_filter = ["is_default"]
