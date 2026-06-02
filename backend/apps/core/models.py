"""AppConfig singleton — site settings, Moodle creds, SMTP, maintenance mode."""
from django.db import models
from django.core.cache import cache

_CACHE_KEY = "kernelios_appconfig"


class AppConfig(models.Model):
    # Maintenance mode
    maintenance_mode = models.BooleanField(default=False)
    maintenance_message = models.TextField(
        default="We are performing scheduled maintenance. We will be back shortly."
    )

    # Global exam pause (affects ALL instances)
    exam_global_paused = models.BooleanField(default=False)

    # Moodle
    moodle_base_url = models.URLField(blank=True, default="")
    moodle_token = models.CharField(max_length=128, blank=True, default="")

    # SMTP
    smtp_host = models.CharField(max_length=255, blank=True, default="")
    smtp_port = models.PositiveIntegerField(default=587)
    smtp_user = models.CharField(max_length=255, blank=True, default="")
    smtp_password = models.CharField(max_length=255, blank=True, default="")
    smtp_from_email = models.EmailField(blank=True, default="noreply@kernelio.com")
    smtp_use_tls = models.BooleanField(default=True)

    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "App Configuration"

    def __str__(self) -> str:
        return "App Configuration"

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        cache.delete(_CACHE_KEY)

    @classmethod
    def get(cls) -> "AppConfig":
        obj = cache.get(_CACHE_KEY)
        if obj is None:
            obj, _ = cls.objects.get_or_create(pk=1)
            cache.set(_CACHE_KEY, obj, 60 * 5)
        return obj
