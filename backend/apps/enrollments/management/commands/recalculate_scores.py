"""
python manage.py recalculate_scores [--instance <id>]
Recalculates all enrollment scores from raw QuestionAttempt data.
"""
from django.core.management.base import BaseCommand
from apps.enrollments.models import Enrollment
from apps.enrollments.scoring import update_enrollment_score


class Command(BaseCommand):
    help = "Recalculate all enrollment scores."

    def add_arguments(self, parser):
        parser.add_argument("--instance", type=int, help="Only recalculate for this instance ID")

    def handle(self, *args, **options):
        qs = Enrollment.objects.select_related("instance", "instance__scenario")
        if options.get("instance"):
            qs = qs.filter(instance_id=options["instance"])

        total = qs.count()
        self.stdout.write(f"Recalculating {total} enrollments...")

        for i, e in enumerate(qs, 1):
            try:
                new_score = update_enrollment_score(e)
                if options.get("verbosity", 1) >= 2:
                    self.stdout.write(f"  {e.user.username}: {new_score:.2f}")
            except Exception as err:
                self.stderr.write(f"  Error on enrollment {e.id}: {err}")

        self.stdout.write(self.style.SUCCESS(f"Done. {total} enrollments updated."))
