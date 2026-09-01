import base64
import datetime
import os
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from apps.telemetry.encryption_service import encrypted_storage_fields
from apps.telemetry.models import EnvironmentalTelemetry
from .services import predict_yield, prediction_cache_key


User = get_user_model()
TEST_KEY = base64.b64encode(b"01234567890123456789012345678901").decode("ascii")


class AnalyticsMixin:
    def setUp(self):
        super().setUp()
        self.previous_key = os.environ.get("TELEMETRY_ENCRYPTION_KEY")
        os.environ["TELEMETRY_ENCRYPTION_KEY"] = TEST_KEY
        cache.clear()
        self.farmer = User.objects.create_user(
            email="farmer@example.com",
            password="StrongPass123!",
            full_name="Farmer",
            role=User.Role.FARMER,
        )
        self.base_time = timezone.now() - datetime.timedelta(days=30)

    def tearDown(self):
        cache.clear()
        if self.previous_key is None:
            os.environ.pop("TELEMETRY_ENCRYPTION_KEY", None)
        else:
            os.environ["TELEMETRY_ENCRYPTION_KEY"] = self.previous_key
        super().tearDown()

    def create_observation(self, index, temperature=24.0, moisture=55.0, ph=None):
        recorded_at = self.base_time + datetime.timedelta(days=index)
        return EnvironmentalTelemetry.objects.create(
            farmer=self.farmer,
            recorded_at=recorded_at,
            **encrypted_storage_fields(
                self.farmer.pk,
                recorded_at,
                temperature,
                moisture,
                ph,
            ),
        )


class AnalyticsServiceTests(AnalyticsMixin, TestCase):
    def test_insufficient_result_reports_actual_observation_counts(self):
        for index in range(4):
            self.create_observation(index)
        result = predict_yield(self.farmer.pk, "MAIZE")
        self.assertIn("error", result)
        self.assertEqual(result["data_points_analyzed"]["temperature"], 4)
        self.assertEqual(result["data_points_analyzed"]["soil_moisture"], 4)

    def test_sufficient_encrypted_data_produces_labelled_rule_based_estimate(self):
        for index in range(10):
            self.create_observation(
                index,
                temperature=22 + index / 2,
                moisture=50 + index,
            )
        result = predict_yield(self.farmer.pk, "MAIZE")
        self.assertNotIn("error", result)
        self.assertEqual(result["model_type"], "WMA Yield Estimate (Rule-Based Forecast)")
        self.assertFalse(result["is_simulation"])
        self.assertIsNone(result["averages"]["ph"])
        self.assertIn("No soil pH observation", result["recommendation"])

    def test_cache_is_crop_specific_invalidated_on_write_and_outage_safe(self):
        for index in range(5):
            self.create_observation(index)
        result = predict_yield(self.farmer.pk, "MAIZE")
        key = prediction_cache_key(self.farmer.pk, "MAIZE")
        self.assertEqual(cache.get(key), result)

        self.create_observation(6)
        self.assertIsNone(cache.get(key))

        with patch("apps.analytics.services.cache.get", side_effect=ConnectionError("offline")), patch(
            "apps.analytics.services.cache.set",
            side_effect=ConnectionError("offline"),
        ):
            uncached = predict_yield(self.farmer.pk, "MAIZE")
        self.assertNotIn("error", uncached)


class AnalyticsViewTests(AnalyticsMixin, TestCase):
    def setUp(self):
        super().setUp()
        self.client = APIClient()
        for index in range(5):
            self.create_observation(index)

    def test_prediction_requires_authentication(self):
        response = self.client.get("/api/v1/analytics/predict/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_prediction_returns_real_estimate_and_disables_simulation(self):
        self.client.force_authenticate(self.farmer)
        response = self.client.get("/api/v1/analytics/predict/?crop_type=MAIZE")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("predicted_yield_metric_tons", response.data)
        simulation = self.client.get(
            "/api/v1/analytics/predict/?sim_temp=25&sim_moisture=50&sim_ph=6"
        )
        self.assertEqual(simulation.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(simulation.data["error"], "Simulation mode is disabled.")

    def test_summary_is_authenticated(self):
        self.client.force_authenticate(self.farmer)
        response = self.client.get("/api/v1/analytics/summary/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
