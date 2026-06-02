"""
Management command: python manage.py seed_admin

Creates the HQ branch and the singleton super-admin on first run.
Safe to re-run — no-ops if they already exist.
"""
from django.core.management.base import BaseCommand

from apps.branches.models import Branch
from apps.accounts.models import Role, User


class Command(BaseCommand):
    help = "Seed the HQ branch and singleton admin user."

    def handle(self, *args, **options):
        # HQ branch
        hq, created = Branch.objects.get_or_create(
            is_hq=True,
            defaults={"name": "HQ"},
        )
        if created:
            self.stdout.write(self.style.SUCCESS("Created HQ branch."))
        else:
            self.stdout.write("HQ branch already exists.")

        # Super-admin
        if User.objects.filter(is_super_admin=True).exists():
            self.stdout.write("Super-admin already exists.")
            return

        admin_user = User.objects.create(
            username="admin",
            email="admin@kernelio.com",
            role=Role.ADMIN,
            branch=hq,
            is_super_admin=True,
            is_staff=True,
            is_superuser=True,
            created_via="manual",
        )
        admin_user.set_password("Admin1234!")
        admin_user.save()
        self.stdout.write(
            self.style.SUCCESS(
                "Created super-admin: username=admin  password=Admin1234!"
            )
        )
        self.stdout.write(
            self.style.WARNING("IMPORTANT: Change the admin password immediately after first login.")
        )
