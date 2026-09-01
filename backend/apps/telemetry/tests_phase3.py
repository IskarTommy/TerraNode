import os
import base64
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.utils import timezone
from apps.telemetry.models import EnvironmentalTelemetry
from apps.telemetry.encryption_service import (
    encrypt_telemetry_payload,
    decrypt_telemetry_payload,
    get_encryption_key
)
from apps.users.models import AuditEvent

User = get_user_model()

class Phase3EncryptionTests(TestCase):
    def setUp(self):
        os.environ["TELEMETRY_ENCRYPTION_KEY"] = base64.b64encode(b"01234567890123456789012345678901").decode('utf-8')
        self.key_bytes = get_encryption_key()
        self.farmer = User.objects.create_user(
            email="crypto_farmer@example.com",
            password="Password123!",
            full_name="Crypto Farmer",
            role="FARMER"
        )
        self.rec_time = timezone.now().isoformat()

    def test_encryption_decryption_round_trip_and_nonce_uniqueness(self):
        ct1, nonce1, tag1, hash1 = encrypt_telemetry_payload(
            farmer_id=self.farmer.id,
            recorded_at_iso=self.rec_time,
            temperature=26.5,
            soil_moisture=55.0,
            soil_ph=6.4,
            key_bytes=self.key_bytes
        )

        decrypted = decrypt_telemetry_payload(
            farmer_id=self.farmer.id,
            recorded_at_iso=self.rec_time,
            ciphertext_b64=ct1,
            nonce_b64=nonce1,
            auth_tag_b64=tag1,
            key_bytes=self.key_bytes
        )

        self.assertEqual(decrypted["temperature_celsius"], 26.5)
        self.assertEqual(decrypted["soil_moisture_percentage"], 55.0)
        self.assertEqual(decrypted["soil_ph"], 6.4)

        ct2, nonce2, tag2, hash2 = encrypt_telemetry_payload(
            farmer_id=self.farmer.id,
            recorded_at_iso=self.rec_time,
            temperature=26.5,
            soil_moisture=55.0,
            soil_ph=6.4,
            key_bytes=self.key_bytes
        )

        self.assertNotEqual(nonce1, nonce2)
        self.assertEqual(hash1, hash2)

    def test_modified_ciphertext_and_wrong_key_fails_closed(self):
        ct, nonce, tag, hash_val = encrypt_telemetry_payload(
            farmer_id=self.farmer.id,
            recorded_at_iso=self.rec_time,
            temperature=30.0,
            soil_moisture=40.0,
            soil_ph=6.0,
            key_bytes=self.key_bytes
        )

        tampered_ct = base64.b64encode(b"TAMPERED_DATA_BYTES_XYZ").decode("utf-8")
        with self.assertRaises(ValueError):
            decrypt_telemetry_payload(
                farmer_id=self.farmer.id,
                recorded_at_iso=self.rec_time,
                ciphertext_b64=tampered_ct,
                nonce_b64=nonce,
                auth_tag_b64=tag,
                key_bytes=self.key_bytes
            )

        alert = AuditEvent.objects.filter(event_type=AuditEvent.EventType.SECURITY_ALERT).first()
        self.assertIsNotNone(alert)

        wrong_key = base64.b64encode(b"wrongkeywrongkeywrongkeywrongkey")
        with self.assertRaises(ValueError):
            decrypt_telemetry_payload(
                farmer_id=self.farmer.id,
                recorded_at_iso=self.rec_time,
                ciphertext_b64=ct,
                nonce_b64=nonce,
                auth_tag_b64=tag,
                key_bytes=base64.b64decode(wrong_key)
            )

    def test_migration_dry_run_and_backfill(self):
        telem = EnvironmentalTelemetry.objects.create(
            farmer=self.farmer,
            recorded_at=timezone.now(),
            temperature_celsius=22.0,
            soil_moisture_percentage=60.0,
            soil_ph=6.5,
            payload_sha256="pre_migration_hash_1"
        )

        call_command("migrate_telemetry_encryption", dry_run=True)
        telem.refresh_from_db()
        self.assertEqual(telem.encrypted_payload_b64, "")

        call_command("migrate_telemetry_encryption")
        telem.refresh_from_db()
        self.assertNotEqual(telem.encrypted_payload_b64, "")
        self.assertEqual(telem.temperature_celsius, 22.0)

        call_command("audit_telemetry_integrity")
        audit_event = AuditEvent.objects.filter(event_type=AuditEvent.EventType.INTEGRITY_CHECK_PASS).first()
        self.assertIsNotNone(audit_event)
