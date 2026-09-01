import base64
import os

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase
from django.utils import timezone

from apps.users.models import AuditEvent
from .encryption_service import (
    decrypt_telemetry_payload,
    encrypt_telemetry_payload,
    read_telemetry_values,
)
from .models import EnvironmentalTelemetry
from .services import generate_telemetry_hash


User = get_user_model()
TEST_KEY_BYTES = b"01234567890123456789012345678901"
TEST_KEY = base64.b64encode(TEST_KEY_BYTES).decode("ascii")


class EncryptionAndMigrationTests(TestCase):
    def setUp(self):
        self.previous_key = os.environ.get("TELEMETRY_ENCRYPTION_KEY")
        os.environ["TELEMETRY_ENCRYPTION_KEY"] = TEST_KEY
        self.farmer = User.objects.create_user(
            email="crypto@example.com",
            password="StrongPass123!",
            full_name="Crypto Farmer",
            role=User.Role.FARMER,
        )

    def tearDown(self):
        if self.previous_key is None:
            os.environ.pop("TELEMETRY_ENCRYPTION_KEY", None)
        else:
            os.environ["TELEMETRY_ENCRYPTION_KEY"] = self.previous_key

    def test_round_trip_nonce_uniqueness_and_tamper_failure(self):
        recorded = timezone.now().isoformat()
        first = encrypt_telemetry_payload(
            self.farmer.pk,
            recorded,
            26.5,
            55.0,
            None,
            key_bytes=TEST_KEY_BYTES,
        )
        second = encrypt_telemetry_payload(
            self.farmer.pk,
            recorded,
            26.5,
            55.0,
            None,
            key_bytes=TEST_KEY_BYTES,
        )
        self.assertNotEqual(first[1], second[1])
        self.assertEqual(first[3], second[3])
        values = decrypt_telemetry_payload(
            self.farmer.pk,
            recorded,
            first[0],
            first[1],
            first[2],
            key_bytes=TEST_KEY_BYTES,
        )
        self.assertEqual(values["temperature_celsius"], 26.5)

        tampered = base64.b64encode(b"tampered").decode("ascii")
        with self.assertRaises(ValueError):
            decrypt_telemetry_payload(
                self.farmer.pk,
                recorded,
                tampered,
                first[1],
                first[2],
                key_bytes=TEST_KEY_BYTES,
            )
        self.assertTrue(
            AuditEvent.objects.filter(
                event_type=AuditEvent.EventType.SECURITY_ALERT
            ).exists()
        )

    def test_legacy_migration_preserves_hash_is_idempotent_and_clears_last(self):
        recorded = timezone.now()
        legacy_hash = generate_telemetry_hash(
            self.farmer.pk,
            recorded,
            22.0,
            60.0,
            6.5,
            schema_version=0,
        )
        record = EnvironmentalTelemetry.objects.create(
            farmer=self.farmer,
            recorded_at=recorded,
            temperature_celsius=22.0,
            soil_moisture_percentage=60.0,
            soil_ph=6.5,
            payload_sha256=legacy_hash,
        )
        call_command("migrate_telemetry_encryption", dry_run=True)
        record.refresh_from_db()
        self.assertFalse(record.encrypted_payload_b64)

        call_command("migrate_telemetry_encryption")
        record.refresh_from_db()
        first_ciphertext = record.encrypted_payload_b64
        self.assertTrue(first_ciphertext)
        self.assertEqual(record.schema_version, 0)
        self.assertEqual(record.payload_sha256, legacy_hash)
        self.assertEqual(record.temperature_celsius, 22.0)

        call_command("migrate_telemetry_encryption")
        record.refresh_from_db()
        self.assertEqual(record.encrypted_payload_b64, first_ciphertext)

        call_command("migrate_telemetry_encryption", clear_plaintext=True)
        record.refresh_from_db()
        self.assertIsNone(record.temperature_celsius)
        self.assertEqual(
            read_telemetry_values(record, request_user=record.farmer)[
                "soil_moisture_percentage"
            ],
            60.0,
        )
        call_command("migrate_telemetry_encryption", clear_plaintext=True)
        record.refresh_from_db()
        self.assertEqual(record.encrypted_payload_b64, first_ciphertext)

    def test_migration_rejects_plaintext_hash_mismatch_without_overwrite(self):
        record = EnvironmentalTelemetry.objects.create(
            farmer=self.farmer,
            recorded_at=timezone.now(),
            temperature_celsius=22.0,
            payload_sha256="ff" * 32,
        )
        with self.assertRaises(CommandError):
            call_command("migrate_telemetry_encryption")
        record.refresh_from_db()
        self.assertFalse(record.encrypted_payload_b64)
        self.assertEqual(record.payload_sha256, "ff" * 32)
