import base64
import hashlib
import os
import urllib.error
from pathlib import Path
from unittest.mock import MagicMock, patch

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase
from django.utils import timezone

from apps.analytics.services import predict_yield
from .encryption_service import encrypted_storage_fields, read_telemetry_values
from .models import DataProvenance, EnvironmentalTelemetry, ImportRun


User = get_user_model()
TEST_KEY = base64.b64encode(b"01234567890123456789012345678901").decode("ascii")
FIXTURE = Path(__file__).parent / "test_fixtures" / "nasa_power_daily.json"


class GenuineDataIngestionTests(TestCase):
    def setUp(self):
        self.previous_key = os.environ.get("TELEMETRY_ENCRYPTION_KEY")
        os.environ["TELEMETRY_ENCRYPTION_KEY"] = TEST_KEY
        self.farmer = User.objects.create_user(
            email="nasa@example.com",
            password="StrongPass123!",
            full_name="Ghana Farmer",
            role=User.Role.FARMER,
        )

    def tearDown(self):
        if self.previous_key is None:
            os.environ.pop("TELEMETRY_ENCRYPTION_KEY", None)
        else:
            os.environ["TELEMETRY_ENCRYPTION_KEY"] = self.previous_key

    def _response(self):
        response = MagicMock()
        response.read.return_value = FIXTURE.read_bytes()
        response.__enter__.return_value = response
        return response

    @patch("urllib.request.urlopen")
    def test_import_is_encrypted_idempotent_and_preserves_partial_observations(self, urlopen):
        urlopen.return_value = self._response()
        arguments = {
            "farmer_email": self.farmer.email,
            "preset": "kumasi",
            "start": "20250101",
            "end": "20250103",
        }
        call_command("import_nasa_power", **arguments)
        records = list(EnvironmentalTelemetry.objects.order_by("recorded_at"))
        self.assertEqual(len(records), 2)
        self.assertTrue(all(record.encrypted_payload_b64 for record in records))
        self.assertTrue(all(record.temperature_celsius is None for record in records))
        values = read_telemetry_values(records[0], request_user=records[0].farmer)
        self.assertEqual(values["temperature_celsius"], 28.5)
        self.assertEqual(values["soil_moisture_percentage"], 55.0)
        self.assertIsNone(values["soil_ph"])

        provenance = DataProvenance.objects.get()
        self.assertEqual(provenance.raw_payload_sha256, hashlib.sha256(FIXTURE.read_bytes()).hexdigest())
        self.assertIn("GWETROOT", provenance.parameters_units)
        first_run = ImportRun.objects.get()
        self.assertEqual(first_run.status, ImportRun.Status.PARTIAL)
        self.assertEqual(first_run.records_inserted, 2)

        call_command("import_nasa_power", **arguments)
        self.assertEqual(EnvironmentalTelemetry.objects.count(), 2)
        self.assertEqual(DataProvenance.objects.count(), 1)
        self.assertEqual(ImportRun.objects.count(), 2)
        latest = ImportRun.objects.order_by("-started_at").first()
        self.assertEqual(latest.records_inserted, 0)
        self.assertEqual(latest.records_skipped, 3)

    @patch("time.sleep", return_value=None)
    @patch("urllib.request.urlopen", side_effect=urllib.error.URLError("offline"))
    def test_failed_fetch_is_recorded_and_creates_no_telemetry(self, urlopen, sleep):
        with self.assertRaises(CommandError):
            call_command(
                "import_nasa_power",
                farmer_email=self.farmer.email,
                preset="accra",
                start="20250101",
                end="20250103",
            )
        run = ImportRun.objects.get()
        self.assertEqual(run.status, ImportRun.Status.FAILED)
        self.assertFalse(EnvironmentalTelemetry.objects.exists())

    def test_wma_requires_real_temperature_and_moisture_without_substitution(self):
        for index in range(5):
            recorded_at = timezone.now() - timezone.timedelta(days=index)
            EnvironmentalTelemetry.objects.create(
                farmer=self.farmer,
                recorded_at=recorded_at,
                **encrypted_storage_fields(
                    self.farmer.pk,
                    recorded_at,
                    27 + index / 10,
                    None,
                    None,
                ),
            )
        insufficient = predict_yield(self.farmer.pk, crop_type="MAIZE")
        self.assertIn("error", insufficient)
        self.assertEqual(
            insufficient["data_points_analyzed"]["soil_moisture"],
            0,
        )

        for index in range(5, 10):
            recorded_at = timezone.now() - timezone.timedelta(days=index)
            EnvironmentalTelemetry.objects.create(
                farmer=self.farmer,
                recorded_at=recorded_at,
                **encrypted_storage_fields(
                    self.farmer.pk,
                    recorded_at,
                    27 + index / 10,
                    50 + index,
                    None,
                ),
            )
        result = predict_yield(self.farmer.pk, crop_type="MAIZE")
        self.assertNotIn("error", result)
        self.assertIsNone(result["averages"]["ph"])
        self.assertEqual(result["data_points_analyzed"]["soil_ph"], 0)
