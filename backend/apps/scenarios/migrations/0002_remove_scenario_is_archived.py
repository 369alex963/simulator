from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("scenarios", "0001_initial"),
    ]
    operations = [
        migrations.RemoveField(
            model_name="scenario",
            name="is_archived",
        ),
    ]
