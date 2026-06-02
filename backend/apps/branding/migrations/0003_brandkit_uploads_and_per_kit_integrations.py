from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("branding", "0002_brandkit_custom_css_brandkit_footer_logo"),
    ]
    operations = [
        migrations.AddField(model_name="brandkit", name="favicon_file",
            field=models.ImageField(null=True, blank=True, upload_to="brand-kits/favicons/")),
        migrations.AddField(model_name="brandkit", name="email_header_logo_file",
            field=models.ImageField(null=True, blank=True, upload_to="brand-kits/logos/")),
        migrations.AddField(model_name="brandkit", name="moodle_base_url",
            field=models.URLField(blank=True, default="", help_text="Override global Moodle URL (optional)")),
        migrations.AddField(model_name="brandkit", name="moodle_token",
            field=models.CharField(blank=True, default="", max_length=128, help_text="Override global Moodle token (optional)")),
        migrations.AddField(model_name="brandkit", name="smtp_host",
            field=models.CharField(blank=True, default="", max_length=255)),
        migrations.AddField(model_name="brandkit", name="smtp_port",
            field=models.PositiveIntegerField(null=True, blank=True)),
        migrations.AddField(model_name="brandkit", name="smtp_user",
            field=models.CharField(blank=True, default="", max_length=255)),
        migrations.AddField(model_name="brandkit", name="smtp_password",
            field=models.CharField(blank=True, default="", max_length=255)),
        migrations.AddField(model_name="brandkit", name="smtp_from_email",
            field=models.EmailField(blank=True, default="", max_length=254)),
        migrations.AddField(model_name="brandkit", name="smtp_use_tls",
            field=models.BooleanField(default=True)),
    ]
