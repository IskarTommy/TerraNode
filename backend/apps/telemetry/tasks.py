from celery import shared_task
from django.core.management import call_command
from apps.telemetry.models import EnvironmentalTelemetry
from apps.telemetry.encryption_service import decrypt_telemetry_payload, serialize_canonical_plaintext
from apps.users.models import AuditEvent
import hashlib

@shared_task
def run_telemetry_integrity_audit_task():
    total = 0
    passed = 0
    failed = 0

    for record in EnvironmentalTelemetry.objects.filter(encrypted_payload_b64__gt='').iterator():
        total += 1
        try:
            rec_iso = record.recorded_at.isoformat()
            decrypted = decrypt_telemetry_payload(
                farmer_id=record.farmer_id,
                recorded_at_iso=rec_iso,
                ciphertext_b64=record.encrypted_payload_b64,
                nonce_b64=record.nonce_b64,
                auth_tag_b64=record.auth_tag_b64,
                schema_version=record.schema_version
            )

            canonical_bytes = serialize_canonical_plaintext(
                farmer_id=record.farmer_id,
                recorded_at_iso=rec_iso,
                temperature=decrypted["temperature_celsius"],
                soil_moisture=decrypted["soil_moisture_percentage"],
                soil_ph=decrypted["soil_ph"],
                schema_version=record.schema_version
            )

            recomputed_hash = hashlib.sha256(canonical_bytes).hexdigest()

            if recomputed_hash == record.payload_sha256:
                passed += 1
            else:
                failed += 1
                AuditEvent.objects.create(
                    event_type=AuditEvent.EventType.INTEGRITY_CHECK_FAIL,
                    description=f"Hash mismatch during audit for telemetry {record.id}: DB={record.payload_sha256}, Computed={recomputed_hash}",
                    metadata={"telemetry_id": str(record.id)}
                )
        except Exception as e:
            failed += 1
            AuditEvent.objects.create(
                event_type=AuditEvent.EventType.INTEGRITY_CHECK_FAIL,
                description=f"Decryption error during audit for telemetry {record.id}: {e}",
                metadata={"telemetry_id": str(record.id), "error": str(e)}
            )

    event_type = AuditEvent.EventType.INTEGRITY_CHECK_PASS if failed == 0 else AuditEvent.EventType.INTEGRITY_CHECK_FAIL
    AuditEvent.objects.create(
        event_type=event_type,
        description=f"Completed telemetry integrity audit task: {passed}/{total} records passed, {failed} failed.",
        metadata={"total": total, "passed": passed, "failed": failed}
    )

    return {"total": total, "passed": passed, "failed": failed}
