import base64
import os
from datetime import timedelta
from unittest import mock

from django.contrib.auth import get_user_model
from django.core.exceptions import PermissionDenied
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from .encryption_service import encrypted_storage_fields, read_telemetry_values
from .models import EnvironmentalTelemetry
from .serializers import TelemetryInputSerializer
from .services import generate_telemetry_hash


User = get_user_model()
TEST_KEY = base64.b64encode(b"01234567890123456789012345678901").decode("ascii")


class TelemetrySerializerAndHashTests(TestCase):
    def test_partial_input_is_valid_but_all_missing_is_not(self):
        serializer = TelemetryInputSerializer(data={"temperature_celsius": 25.0})
        self.assertTrue(serializer.is_valid(), serializer.errors)
        empty = TelemetryInputSerializer(data={})
        self.assertFalse(empty.is_valid())
        self.assertIn("non_field_errors", empty.errors)

    def test_measurement_ranges_and_hash_versioning(self):
        invalid = TelemetryInputSerializer(data={"soil_moisture_percentage": 101})
        self.assertFalse(invalid.is_valid())
        recorded_at = timezone.now()
        current = generate_telemetry_hash("farmer", recorded_at, 25, 50, None)
        legacy = generate_telemetry_hash(
            "farmer",
            recorded_at,
            25,
            50,
            None,
            schema_version=0,
        )
        self.assertNotEqual(current, legacy)
        self.assertEqual(
            current,
            generate_telemetry_hash("farmer", recorded_at, 25, 50, None),
        )


class EncryptedTelemetryAPITests(TestCase):
    def setUp(self):
        self.key_environment = mock.patch.dict(
            os.environ,
            {
                "TELEMETRY_ENCRYPTION_KEY_V1": TEST_KEY,
                "TELEMETRY_ENCRYPTION_KEY": TEST_KEY,
            },
        )
        self.key_environment.start()
        self.addCleanup(self.key_environment.stop)
        self.client = APIClient()
        self.farmer = User.objects.create_user(
            email="farmer@example.com",
            password="StrongPass123!",
            full_name="Farmer",
            role=User.Role.FARMER,
        )
        self.other_farmer = User.objects.create_user(
            email="other@example.com",
            password="StrongPass123!",
            full_name="Other",
            role=User.Role.FARMER,
        )
        self.logistics = User.objects.create_user(
            email="logistics@example.com",
            password="StrongPass123!",
            full_name="Logistics",
            role=User.Role.LOGISTICS,
        )

    def test_submission_encrypts_at_rest_and_authorized_output_decrypts(self):
        self.client.force_authenticate(self.farmer)
        response = self.client.post(
            reverse("telemetry_submit"),
            {
                "temperature_celsius": 25.25,
                "soil_moisture_percentage": 60.0,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["temperature_celsius"], 25.25)
        self.assertIsNone(response.data["soil_ph"])
        record = EnvironmentalTelemetry.objects.get()
        self.assertIsNone(record.temperature_celsius)
        self.assertIsNone(record.soil_moisture_percentage)
        self.assertTrue(record.encrypted_payload_b64)
        self.assertIsNotNone(record.encrypted_at)
        self.assertEqual(
            read_telemetry_values(record, request_user=self.farmer)["temperature_celsius"],
            25.25,
        )

    def test_missing_key_fails_without_storing_plaintext(self):
        os.environ.pop("TELEMETRY_ENCRYPTION_KEY_V1", None)
        os.environ.pop("TELEMETRY_ENCRYPTION_KEY", None)
        self.client.force_authenticate(self.farmer)
        response = self.client.post(
            reverse("telemetry_submit"),
            {"temperature_celsius": 25.0},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
        self.assertFalse(EnvironmentalTelemetry.objects.exists())

    def test_privileged_decryption_requires_an_approved_system_purpose(self):
        recorded_at = timezone.now()
        record = EnvironmentalTelemetry.objects.create(
            farmer=self.farmer,
            recorded_at=recorded_at,
            **encrypted_storage_fields(self.farmer.pk, recorded_at, 24.0, 55.0, None),
        )
        with self.assertRaises(PermissionDenied):
            read_telemetry_values(record, enforce_authorization=False)
        values = read_telemetry_values(
            record,
            enforce_authorization=False,
            system_purpose="integrity_audit",
        )
        self.assertEqual(values["temperature_celsius"], 24.0)

    def test_history_is_scoped_and_decrypted_for_authorized_farmer(self):
        recorded_at = timezone.now()
        record = EnvironmentalTelemetry.objects.create(
            farmer=self.farmer,
            recorded_at=recorded_at,
            **encrypted_storage_fields(self.farmer.pk, recorded_at, 24.0, 55.0, None),
        )
        other_time = timezone.now()
        EnvironmentalTelemetry.objects.create(
            farmer=self.other_farmer,
            recorded_at=other_time,
            **encrypted_storage_fields(self.other_farmer.pk, other_time, 29.0, 40.0, None),
        )
        self.client.force_authenticate(self.farmer)
        response = self.client.get(reverse("telemetry_history"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 1)
        self.assertEqual(response.data["results"][0]["id"], str(record.pk))
        self.assertEqual(response.data["results"][0]["temperature_celsius"], 24.0)

    def test_history_validates_and_applies_iso_date_filters(self):
        older_time = timezone.now() - timedelta(days=3)
        newer_time = timezone.now()
        older = EnvironmentalTelemetry.objects.create(
            farmer=self.farmer,
            recorded_at=older_time,
            **encrypted_storage_fields(self.farmer.pk, older_time, 20.0, 50.0, None),
        )
        newer = EnvironmentalTelemetry.objects.create(
            farmer=self.farmer,
            recorded_at=newer_time,
            **encrypted_storage_fields(self.farmer.pk, newer_time, 25.0, 60.0, None),
        )
        self.client.force_authenticate(self.farmer)
        response = self.client.get(
            reverse("telemetry_history"),
            {"start": (timezone.now() - timedelta(days=1)).date().isoformat()},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ids = {item["id"] for item in response.data["results"]}
        self.assertEqual(ids, {str(newer.pk)})
        self.assertNotIn(str(older.pk), ids)

        invalid = self.client.get(reverse("telemetry_history"), {"start": "not-a-date"})
        self.assertEqual(invalid.status_code, status.HTTP_400_BAD_REQUEST)

    def test_non_farmer_cannot_submit_or_read_history(self):
        self.client.force_authenticate(self.logistics)
        submit = self.client.post(
            reverse("telemetry_submit"),
            {"temperature_celsius": 25.0},
            format="json",
        )
        self.assertEqual(submit.status_code, status.HTTP_403_FORBIDDEN)
        history = self.client.get(reverse("telemetry_history"))
        self.assertEqual(history.status_code, status.HTTP_403_FORBIDDEN)

    def test_duplicate_canonical_submission_conflicts(self):
        fixed = timezone.now()
        self.client.force_authenticate(self.farmer)
        payload = {
            "recorded_at": fixed.isoformat(),
            "temperature_celsius": 25.0,
        }
        first = self.client.post(reverse("telemetry_submit"), payload, format="json")
        second = self.client.post(reverse("telemetry_submit"), payload, format="json")
        self.assertEqual(first.status_code, status.HTTP_201_CREATED)
        self.assertEqual(second.status_code, status.HTTP_409_CONFLICT)
