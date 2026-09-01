from django.core.management.base import BaseCommand
from apps.telemetry.tasks import run_telemetry_integrity_audit_task

class Command(BaseCommand):
    help = "Run telemetry integrity audit standalone or via background queue."

    def handle(self, *args, **options):
        self.stdout.write("Running telemetry integrity audit...")
        result = run_telemetry_integrity_audit_task()
        self.stdout.write(self.style.SUCCESS(
            f"Audit finished: {result['passed']}/{result['total']} passed, {result['failed']} failed."
        ))
