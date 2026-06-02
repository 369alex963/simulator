from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("branding", "0001_initial"),
    ]
    operations = [
        migrations.AddField(
            model_name="brandkit",
            name="footer_logo_url",
            field=models.URLField(blank=True, default="",
                help_text="Optional footer logo (defaults to main logo)"),
        ),
        migrations.AddField(
            model_name="brandkit",
            name="footer_logo_file",
            field=models.ImageField(null=True, blank=True, upload_to="brand-kits/logos/"),
        ),
        migrations.AddField(
            model_name="brandkit",
            name="custom_css",
            field=models.TextField(blank=True, default="",
                help_text="Custom CSS overrides"),
        ),
    ]
