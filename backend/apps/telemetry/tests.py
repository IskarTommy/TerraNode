from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from django.utils import timezone
from rest_framework_simplejwt.tokens import RefreshToken
from .models import EnvironmentalTelemetry
from .serializers import TelemetryInputSerializer, TelemetryOutputSerializer
from .services import generate_telemetry_hash
import json

User = get_user_model()

class TelemetrySerializerTests(TestCase):
    def test_valid_telemetry_input(self):
        data = {
            'temperature_celsius': 25.0,
            'soil_moisture_percentage': 60.0,
            'soil_ph': 6.5
        }
        serializer = TelemetryInputSerializer(data=data)
        self.assertTrue(serializer.is_valid())
        self.assertEqual(serializer.validated_data['temperature_celsius'], 25.0)

    def test_invalid_temperature_too_low(self):
        data = {
            'temperature_celsius': -60.0,  # below -50
            'soil_moisture_percentage': 60.0,
            'soil_ph': 6.5
        }
        serializer = TelemetryInputSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('temperature_celsius', serializer.errors)

    def test_invalid_soil_moisture_over_100(self):
        data = {
            'temperature_celsius': 25.0,
            'soil_moisture_percentage': 150.0,  # above 100
            'soil_ph': 6.5
        }
        serializer = TelemetryInputSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('soil_moisture_percentage', serializer.errors)

    def test_invalid_ph_out_of_range(self):
        data = {
            'temperature_celsius': 25.0,
            'soil_moisture_percentage': 60.0,
            'soil_ph': 15.0  # above 14
        }
        serializer = TelemetryInputSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('soil_ph', serializer.errors)

class TelemetryServiceTests(TestCase):
    def test_hash_deterministic(self):
        farmer_id = '11111111-1111-1111-1111-111111111111'
        recorded_at = timezone.now()
        temp = 25.5
        moisture = 60.2
        ph = 6.7
        hash1 = generate_telemetry_hash(farmer_id, recorded_at, temp, moisture, ph)
        hash2 = generate_telemetry_hash(farmer_id, recorded_at, temp, moisture, ph)
        self.assertEqual(hash1, hash2)

    def test_hash_different_for_different_inputs(self):
        farmer_id = '11111111-1111-1111-1111-111111111111'
        recorded_at = timezone.now()
        temp = 25.5
        moisture = 60.2
        ph = 6.7
        hash1 = generate_telemetry_hash(farmer_id, recorded_at, temp, moisture, ph)
        # change one value
        hash2 = generate_telemetry_hash(farmer_id, recorded_at, temp + 1, moisture, ph)
        self.assertNotEqual(hash1, hash2)

class TelemetryViewTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.submit_url = '/api/v1/telemetry/submit/'
        self.history_url = '/api/v1/telemetry/history/'
        self.latest_url = '/api/v1/telemetry/latest/'
        # Create a farmer user
        self.farmer = User.objects.create_user(
            email='farmer@example.com',
            password='Pass1234!',
            full_name='Farmer John',
            role='FARMER'
        )
        # Create an admin user
        self.admin = User.objects.create_superuser(
            email='admin@example.com',
            password='AdminPass123!',
            full_name='Admin Admin',
            role='ADMIN'
        )
        # Create a logistics user
        self.logistics = User.objects.create_user(
            email='logistics@example.com',
            password='Pass1234!',
            full_name='Logistics Linda',
            role='LOGISTICS'
        )

    def _authenticate(self, user):
        refresh = RefreshToken.for_user(user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')

    def test_submit_telemetry_unauthenticated(self):
        data = {
            'temperature_celsius': 25.0,
            'soil_moisture_percentage': 60.0,
            'soil_ph': 6.5
        }
        response = self.client.post(self.submit_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_submit_telemetry_non_farmer_forbidden(self):
        self._authenticate(self.logistics)  # logistics user
        data = {
            'temperature_celsius': 25.0,
            'soil_moisture_percentage': 60.0,
            'soil_ph': 6.5
        }
        response = self.client.post(self.submit_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_submit_telemetry_success(self):
        self._authenticate(self.farmer)
        data = {
            'temperature_celsius': 25.0,
            'soil_moisture_percentage': 60.0,
            'soil_ph': 6.5
        }
        response = self.client.post(self.submit_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('id', response.data)
        self.assertEqual(response.data['temperature_celsius'], 25.0)
        self.assertEqual(response.data['soil_moisture_percentage'], 60.0)
        self.assertEqual(response.data['soil_ph'], 6.5)
        # Check that a telemetry record was created
        self.assertEqual(EnvironmentalTelemetry.objects.count(), 1)
        telemetry = EnvironmentalTelemetry.objects.first()
        self.assertEqual(telemetry.farmer, self.farmer)
        # Check that the hash matches
        expected_hash = generate_telemetry_hash(
            farmer_id=self.farmer.id,
            recorded_at=telemetry.recorded_at,
            temperature=25.0,
            soil_moisture=60.0,
            soil_ph=6.5
        )
        self.assertEqual(telemetry.payload_sha256, expected_hash)

    def test_submit_telemetry_duplicate_hash_conflict(self):
        from unittest import mock
        # The hash includes recorded_at, so freeze time so both submissions
        # produce an identical payload_sha256 and trip the unique constraint.
        fixed_time = timezone.now()
        self._authenticate(self.farmer)
        data = {
            'temperature_celsius': 25.0,
            'soil_moisture_percentage': 60.0,
            'soil_ph': 6.5
        }
        # First submission
        with mock.patch('django.utils.timezone.now', return_value=fixed_time):
            response1 = self.client.post(self.submit_url, data, format='json')
            self.assertEqual(response1.status_code, status.HTTP_201_CREATED)
            # Second submission with same data (should produce same hash)
            response2 = self.client.post(self.submit_url, data, format='json')
        # According to the view, duplicate hash results in 409 Conflict
        self.assertEqual(response2.status_code, status.HTTP_409_CONFLICT)
        self.assertIn('error', response2.data)

    def test_submit_telemetry_invalid_data(self):
        self._authenticate(self.farmer)
        data = {
            'temperature_celsius': -60.0,  # invalid
            'soil_moisture_percentage': 60.0,
            'soil_ph': 6.5
        }
        response = self.client.post(self.submit_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        # Custom exception handler wraps validation errors inside error.details
        self.assertIn('temperature_celsius', response.data['error']['details'])

    def test_history_view_access_control(self):
        # Create a telemetry record for farmer
        telemetry = EnvironmentalTelemetry.objects.create(
            farmer=self.farmer,
            recorded_at=timezone.now(),
            temperature_celsius=25.0,
            soil_moisture_percentage=60.0,
            soil_ph=6.5,
            payload_sha256='dummyhash'
        )
        # Test farmer can see own history
        self._authenticate(self.farmer)
        response = self.client.get(self.history_url, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # History is paginated (StandardPagination) → records under 'results'
        self.assertEqual(len(response.data['results']), 1)  # only his own
        # Test admin can see all
        self._authenticate(self.admin)
        response = self.client.get(self.history_url, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)  # still only one total
        # Test logistics cannot see history (IsFarmerOrAdmin)
        self._authenticate(self.logistics)
        response = self.client.get(self.history_url, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_latest_view_access_control(self):
        telemetry = EnvironmentalTelemetry.objects.create(
            farmer=self.farmer,
            recorded_at=timezone.now(),
            temperature_celsius=25.0,
            soil_moisture_percentage=60.0,
            soil_ph=6.5,
            payload_sha256='dummyhash'
        )
        # Farmer can see latest
        self._authenticate(self.farmer)
        response = self.client.get(self.latest_url, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['id'], str(telemetry.id))
        # Admin can see latest
        self._authenticate(self.admin)
        response = self.client.get(self.latest_url, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Logistics cannot
        self._authenticate(self.logistics)
        response = self.client.get(self.latest_url, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)