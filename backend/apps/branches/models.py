from django.db import models


class Branch(models.Model):
    name = models.CharField(max_length=120, unique=True)
    is_hq = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    brand_kit = models.ForeignKey(
        "branding.BrandKit",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="branches",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = "branches"
        ordering = ["-is_hq", "name"]

    def __str__(self) -> str:
        return f"{self.name} {'[HQ]' if self.is_hq else ''}"

    @classmethod
    def get_hq(cls) -> "Branch":
        return cls.objects.get(is_hq=True)
