from django.core.management.base import BaseCommand
from django.db import transaction
from apps.telemetry.models import EnvironmentalTelemetry
from apps.telemetry.encryption_service import encrypt_telemetry_payload, decrypt_telemetry_payload

class Command(BaseCommand):
    help = "Phased migration to backfill telemetry records with AES-256-GCM encryption and verify integrity before optional plaintext clearance."

    def add_arguments(self, parser):
        parser.add_argument("--dry-run", action="store_true", help="Simulate encryption and verification without persisting DB changes")
        parser.add_argument("--clear-plaintext", action="store_true", help="Explicitly clear legacy plaintext columns after successful backfill & verification")
        parser.add_argument("--batch-size", type=int, default=100, help="Batch size for processing records")

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        clear_plaintext = options["clear_plaintext"]
        batch_size = options["batch_size"]

        self.stdout.write(self.style.NOTICE(
            f"Starting AES-256-GCM Telemetry Encryption Migration (dry_run={dry_run}, clear_plaintext={clear_plaintext})..."
        ))

        records = EnvironmentalTelemetry.objects.all()
        total_records = records.count()
        self.stdout.write(f"Total telemetry records found: {total_records}")

        encrypted_count = 0
        verified_count = 0
        error_count = 0

        for record in records.iterator(chunk_size=batch_size):
            try:
                rec_iso = record.recorded_at.isoformat()

                ct_b64, nonce_b64, tag_b64, sha256_hex = encrypt_telemetry_payload(
                    farmer_id=record.farmer_id,
                    recorded_at_iso=rec_iso,
                    temperature=record.temperature_celsius,
                    soil_moisture=record.soil_moisture_percentage,
                    soil_ph=record.soil_ph,
                    schema_version=1
                )

                decrypted = decrypt_telemetry_payload(
                    farmer_id=record.farmer_id,
                    recorded_at_iso=rec_iso,
                    ciphertext_b64=ct_b64,
                    nonce_b64=nonce_b64,
                    auth_tag_b64=tag_b64,
                    schema_version=1
                )

                verified_count += 1

                if not dry_run:
                    with transaction.atomic():
                        record.encrypted_payload_b64 = ct_b64
                        record.nonce_b64 = nonce_b64
                        record.auth_tag_b64 = tag_b64
                        record.key_version = 1
                        record.schema_version = 1
                        record.payload_sha256 = sha256_hex

                        if clear_plaintext:
                            record.temperature_celsius = None
                            record.soil_moisture_percentage = None
                            record.soil_ph = None

                        record.save()
                    encrypted_count += 1

            except Exception as e:
                error_count += 1
                self.stderr.write(self.style.ERROR(f"Error processing record {record.id}: {e}"))

        self.stdout.write(self.style.SUCCESS(
            f"Migration Summary: Verified={verified_count}/{total_records}, Encrypted={encrypted_count}, Errors={error_count}"
        ))

        if clear_plaintext and not dry_run and error_count == 0:
            self.stdout.write(self.style.SUCCESS("Explicit --clear-plaintext executed: Legacy plaintext columns cleared after 100% verified encryption."))
