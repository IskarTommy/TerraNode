import json
from unittest.mock import patch, MagicMock
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.core.management import call_command
from apps.telemetry.models import EnvironmentalTelemetry, DataProvenance, ImportRun
from apps.analytics.services import predict_yield

User = get_user_model()

MOCK_NASA_POWER_RESPONSE = {
    "properties": {
        "parameter": {
            "T2M": {
                "20250101": 28.5,
                "20250102": 29.1,
                "20250103": -999.0
            },
            "PRECTOTCORR": {
                "20250101": 0.5,
                "20250102": 12.0,
                "20250103": 0.0
            }
        }
    }
}

class Phase2IngestionTests(TestCase):
    def setUp(self):
        self.farmer = User.objects.create_user(
            email="farmer_nasa@example.com",
            password="Password123!",
            full_name="Ghana Farmer",
            role="FARMER"
        )

    @patch("urllib.request.urlopen")
    def test_nasa_power_importer_preset_and_idempotency(self, mock_urlopen):
        mock_response = MagicMock()
        mock_response.read.return_value = json.dumps(MOCK_NASA_POWER_RESPONSE).encode("utf-8")
        mock_response.__enter__.return_value = mock_response
        mock_urlopen.return_value = mock_response

        call_command(
            "import_nasa_power",
            farmer_email="farmer_nasa@example.com",
            preset="kumasi",
            start="20250101",
            end="20250103"
        )

        provenance = DataProvenance.objects.filter(source_record_id__contains="6.6885").first()
        self.assertIsNotNone(provenance)
        self.assertEqual(provenance.source_type, DataProvenance.SourceType.DATASET_IMPORT)

        records = EnvironmentalTelemetry.objects.filter(farmer=self.farmer)
        self.assertTrue(records.count() >= 2)

        first_record = records.first()
        self.assertIsNone(first_record.soil_moisture_percentage)
        self.assertIsNone(first_record.soil_ph)

        call_command(
            "import_nasa_power",
            farmer_email="farmer_nasa@example.com",
            preset="kumasi",
            start="20250101",
            end="20250103"
        )

        import_run = ImportRun.objects.filter(provenance=provenance).order_by('-started_at').first()
        self.assertIsNotNone(import_run)

    def test_wma_yield_estimate_partial_observations(self):
        for i in range(10):
            EnvironmentalTelemetry.objects.create(
                farmer=self.farmer,
                recorded_at=f"2025-01-{i+1:02d}T12:00:00Z",
                temperature_celsius=27.0 + (i * 0.1),
                soil_moisture_percentage=None,
                soil_ph=None,
                payload_sha256=f"hash_partial_{i}"
            )

        res = predict_yield(self.farmer.id, crop_type="MAIZE")
        self.assertNotIn("error", res)
        self.assertEqual(res["model_type"], "WMA Yield Estimate (Rule-Based Forecast)")
        self.assertIn("temperature (10 records)", res["contributing_observations"])
        self.assertIsNone(res["averages"]["moisture"])
        self.assertIsNone(res["averages"]["ph"])
