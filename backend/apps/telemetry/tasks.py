import logging

from celery import shared_task

from apps.users.models import AuditEvent
from .encryption_service import read_telemetry_values
from .models import EnvironmentalTelemetry


logger = logging.getLogger(__name__)


@shared_task
def run_telemetry_integrity_audit_task():
    total = passed = failed = 0
    for record in EnvironmentalTelemetry.objects.all().iterator():
        total += 1
        try:
            read_telemetry_values(record, enforce_authorization=False)
            passed += 1
        except Exception as exc:
            failed += 1
            logger.exception("Telemetry integrity audit failed for %s", record.pk)
            AuditEvent.objects.create(
                event_type=AuditEvent.EventType.INTEGRITY_CHECK_FAIL,
                description="Telemetry record failed the integrity audit",
                metadata={
                    "telemetry_id": str(record.pk),
                    "failure_type": type(exc).__name__,
                },
            )

    event_type = (
        AuditEvent.EventType.INTEGRITY_CHECK_PASS
        if failed == 0
        else AuditEvent.EventType.INTEGRITY_CHECK_FAIL
    )
    AuditEvent.objects.create(
        event_type=event_type,
        description=f"Telemetry integrity audit completed: {passed}/{total} passed",
        metadata={"total": total, "passed": passed, "failed": failed},
    )
    return {"total": total, "passed": passed, "failed": failed}
