from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from apps.telemetry.encryption_service import (
    encrypt_telemetry_payload,
    read_telemetry_values,
)
from apps.telemetry.models import EnvironmentalTelemetry
from apps.telemetry.services import (
    CURRENT_SCHEMA_VERSION,
    LEGACY_SCHEMA_VERSION,
    generate_telemetry_hash,
)


class Command(BaseCommand):
    help = (
        "Idempotently backfill AES-256-GCM telemetry encryption. "
        "Plaintext is cleared only in a separate all-records-verified finalization."
    )

    def add_arguments(self, parser):
        parser.add_argument("--dry-run", action="store_true")
        parser.add_argument("--clear-plaintext", action="store_true")
        parser.add_argument("--batch-size", type=int, default=100)
        parser.add_argument("--key-version", type=int, default=1)

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        clear_plaintext = options["clear_plaintext"]
        batch_size = max(1, options["batch_size"])
        key_version = options["key_version"]
        total = EnvironmentalTelemetry.objects.count()
        encrypted = verified = skipped = errors = 0

        for record in EnvironmentalTelemetry.objects.all().iterator(chunk_size=batch_size):
            try:
                if record.encrypted_payload_b64:
                    read_telemetry_values(
                        record,
                        enforce_authorization=False,
                        system_purpose="encryption_migration",
                    )
                    verified += 1
                    skipped += 1
                    continue

                values = {
                    "temperature_celsius": record.temperature_celsius,
                    "soil_moisture_percentage": record.soil_moisture_percentage,
                    "soil_ph": record.soil_ph,
                }
                candidates = (
                    CURRENT_SCHEMA_VERSION,
                    LEGACY_SCHEMA_VERSION,
                )
                schema_version = next(
                    (
                        version
                        for version in candidates
                        if generate_telemetry_hash(
                            record.farmer_id,
                            record.recorded_at,
                            values["temperature_celsius"],
                            values["soil_moisture_percentage"],
                            values["soil_ph"],
                            schema_version=version,
                        )
                        == record.payload_sha256
                    ),
                    None,
                )
                if schema_version is None:
                    raise ValueError("stored hash does not match legacy or current canonical plaintext")

                ciphertext, nonce, tag, payload_hash = encrypt_telemetry_payload(
                    record.farmer_id,
                    record.recorded_at.isoformat(),
                    values["temperature_celsius"],
                    values["soil_moisture_percentage"],
                    values["soil_ph"],
                    schema_version=schema_version,
                    key_version=key_version,
                )
                if payload_hash != record.payload_sha256:
                    raise ValueError("encryption changed the canonical telemetry identity")
                verified += 1
                if not dry_run:
                    with transaction.atomic():
                        locked = EnvironmentalTelemetry.objects.select_for_update().get(pk=record.pk)
                        if not locked.encrypted_payload_b64:
                            locked.encrypted_payload_b64 = ciphertext
                            locked.nonce_b64 = nonce
                            locked.auth_tag_b64 = tag
                            locked.key_version = key_version
                            locked.schema_version = schema_version
                            locked.encrypted_at = timezone.now()
                            locked.save(
                                update_fields=[
                                    "encrypted_payload_b64",
                                    "nonce_b64",
                                    "auth_tag_b64",
                                    "key_version",
                                    "schema_version",
                                    "encrypted_at",
                                ]
                            )
                            encrypted += 1
            except Exception as exc:
                errors += 1
                self.stderr.write(f"{record.pk}: {type(exc).__name__}: {exc}")

        if clear_plaintext and not dry_run and errors == 0:
            # Re-read every record before the irreversible finalization. One failure
            # prevents clearing any plaintext in this run.
            for record in EnvironmentalTelemetry.objects.all().iterator(chunk_size=batch_size):
                try:
                    read_telemetry_values(
                        record,
                        enforce_authorization=False,
                        system_purpose="encryption_migration",
                    )
                except Exception as exc:
                    errors += 1
                    self.stderr.write(f"{record.pk}: final verification failed: {exc}")
                    break
            if errors == 0:
                with transaction.atomic():
                    EnvironmentalTelemetry.objects.all().update(
                        temperature_celsius=None,
                        soil_moisture_percentage=None,
                        soil_ph=None,
                    )

        summary = (
            f"total={total} verified={verified} encrypted={encrypted} "
            f"already_encrypted={skipped} errors={errors} dry_run={dry_run}"
        )
        if errors:
            raise CommandError(f"Telemetry encryption migration failed closed: {summary}")
        self.stdout.write(self.style.SUCCESS(summary))
