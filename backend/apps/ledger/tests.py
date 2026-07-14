from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from django.utils import timezone
from .models import ProduceBatch
from apps.telemetry.models import EnvironmentalTelemetry
from apps.telemetry.services import generate_telemetry_hash
from .serializers import BatchPrepareSerializer, BatchConfirmSerializer
from .services import verify_integrity
import uuid

User = get_user_model()

class BatchSerializerTests(TestCase):
    def setUp(self):
        # Create a telemetry instance for foreign key
        self.farmer = User.objects.create_user(
            email='farmer@example.com',
            password='Pass1234!',
            full_name='Farmer',
            role='FARMER'
        )
        self.telemetry = EnvironmentalTelemetry.objects.create(
            farmer=self.farmer,
            recorded_at=timezone.now(),
            temperature_celsius=25.0,
            soil_moisture_percentage=60.0,
            soil_ph=6.5,
            payload_sha256=generate_telemetry_hash(
                farmer_id=self.farmer.id,
                recorded_at=timezone.now(),
                temperature=25.0,
                soil_moisture=60.0,
                soil_ph=6.5,
            )
        )

    def test_batch_prepare_serializer_valid(self):
        data = {
            'origin_telemetry': str(self.telemetry.id),
            'crop_type': 'Maize',
            'weight_kg': 100.5
        }
        serializer = BatchPrepareSerializer(data=data)
        self.assertTrue(serializer.is_valid())
        self.assertEqual(serializer.validated_data['crop_type'], 'Maize')

    def test_batch_prepare_serializer_invalid_telemetry(self):
        data = {
            'origin_telemetry': str(uuid.uuid4()),  # non-existent ID
            'crop_type': 'Maize',
            'weight_kg': 100.5
        }
        serializer = BatchPrepareSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('origin_telemetry', serializer.errors)

    def test_batch_prepare_serializer_missing_fields(self):
        data = {
            'origin_telemetry': str(self.telemetry.id)
            # missing crop_type and weight_kg
        }
        serializer = BatchPrepareSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('crop_type', serializer.errors)
        self.assertIn('weight_kg', serializer.errors)

    def test_batch_confirm_serializer_valid(self):
        data = {
            'sui_object_id': '0x123abcdef...'
        }
        serializer = BatchConfirmSerializer(data=data)
        self.assertTrue(serializer.is_valid())
        self.assertEqual(serializer.validated_data['sui_object_id'], '0x123abcdef...')

    def test_batch_confirm_serializer_missing_sui_object_id(self):
        data = {}
        serializer = BatchConfirmSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('sui_object_id', serializer.errors)

class BatchViewTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        # Create users
        self.farmer = User.objects.create_user(
            email='farmer@example.com',
            password='Pass1234!',
            full_name='Farmer',
            role='FARMER'
        )
        self.logistics = User.objects.create_user(
            email='logistics@example.com',
            password='Pass1234!',
            full_name='Logistics',
            role='LOGISTICS'
        )
        self.admin = User.objects.create_superuser(
            email='admin@example.com',
            password='AdminPass123!',
            full_name='Admin',
            role='ADMIN'
        )
        # Create telemetry for batch origin
        self.telemetry = EnvironmentalTelemetry.objects.create(
            farmer=self.farmer,
            recorded_at=timezone.now(),
            temperature_celsius=25.0,
            soil_moisture_percentage=60.0,
            soil_ph=6.5,
            payload_sha256='abcd1234'
        )
        # URLs (based on ledger/urls.py)
        self.prepare_url = '/api/v1/ledger/prepare/'
        self.list_url = '/api/v1/ledger/list/'
        # We'll need detail URLs for confirm and transfer; we'll construct using batch id
        # We'll create a batch via prepare first in some tests.

    def _authenticate(self, user):
        from rest_framework_simplejwt.tokens import RefreshToken
        refresh = RefreshToken.for_user(user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')

    def test_prepare_batch_unauthenticated(self):
        data = {
            'origin_telemetry': str(self.telemetry.id),
            'crop_type': 'Maize',
            'weight_kg': 100.5
        }
        response = self.client.post(self.prepare_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_prepare_batch_non_farmer_forbidden(self):
        self._authenticate(self.logistics)
        data = {
            'origin_telemetry': str(self.telemetry.id),
            'crop_type': 'Maize',
            'weight_kg': 100.5
        }
        response = self.client.post(self.prepare_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_prepare_batch_success(self):
        self._authenticate(self.farmer)
        data = {
            'origin_telemetry': str(self.telemetry.id),
            'crop_type': 'Maize',
            'weight_kg': 100.5
        }
        response = self.client.post(self.prepare_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('id', response.data)
        self.assertEqual(response.data['status'], 'PENDING')
        self.assertEqual(response.data['crop_type'], 'Maize')
        self.assertEqual(float(response.data['weight_kg']), 100.5)
        # Check that batch was created in DB
        batch_id = response.data['id']
        batch = ProduceBatch.objects.get(id=batch_id)
        self.assertEqual(batch.origin_telemetry, self.telemetry)
        self.assertEqual(batch.current_custodian, self.farmer)
        self.assertEqual(batch.status, ProduceBatch.Status.PENDING)

    def test_prepare_batch_invalid_telemetry(self):
        self._authenticate(self.farmer)
        data = {
            'origin_telemetry': '00000000-0000-0000-0000-000000000000',  # non-existent
            'crop_type': 'Maize',
            'weight_kg': 100.5
        }
        response = self.client.post(self.prepare_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        # Custom exception handler wraps validation errors inside error.details
        self.assertIn('origin_telemetry', response.data['error']['details'])

    def test_confirm_batch_success(self):
        # First create a batch via prepare
        self._authenticate(self.farmer)
        prepare_resp = self.client.post(self.prepare_url, {
            'origin_telemetry': str(self.telemetry.id),
            'crop_type': 'Maize',
            'weight_kg': 100.5
        }, format='json')
        self.assertEqual(prepare_resp.status_code, status.HTTP_201_CREATED)
        batch_id = prepare_resp.data['id']
        # Now confirm
        confirm_url = f'/api/v1/ledger/{batch_id}/confirm/'
        self._authenticate(self.farmer)  # still authenticated
        confirm_resp = self.client.post(confirm_url, {
            'sui_object_id': '0x123abcdef123456789'
        }, format='json')
        self.assertEqual(confirm_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(confirm_resp.data['status'], 'MINTED')
        self.assertEqual(confirm_resp.data['sui_object_id'], '0x123abcdef123456789')
        # Verify in DB
        batch = ProduceBatch.objects.get(id=batch_id)
        self.assertEqual(batch.status, ProduceBatch.Status.MINTED)
        self.assertEqual(batch.sui_object_id, '0x123abcdef123456789')

    def test_confirm_batch_wrong_user_forbidden(self):
        self._authenticate(self.farmer)
        prepare_resp = self.client.post(self.prepare_url, {
            'origin_telemetry': str(self.telemetry.id),
            'crop_type': 'Maize',
            'weight_kg': 100.5
        }, format='json')
        batch_id = prepare_resp.data['id']
        # Logistics tries to confirm
        self._authenticate(self.logistics)
        confirm_url = f'/api/v1/ledger/{batch_id}/confirm/'
        confirm_resp = self.client.post(confirm_url, {
            'sui_object_id': '0x123abcdef123456789'
        }, format='json')
        self.assertEqual(confirm_resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_confirm_batch_invalid_sui_object_id(self):
        self._authenticate(self.farmer)
        prepare_resp = self.client.post(self.prepare_url, {
            'origin_telemetry': str(self.telemetry.id),
            'crop_type': 'Maize',
            'weight_kg': 100.5
        }, format='json')
        batch_id = prepare_resp.data['id']
        self._authenticate(self.farmer)
        confirm_url = f'/api/v1/ledger/{batch_id}/confirm/'
        confirm_resp = self.client.post(confirm_url, {
            # missing sui_object_id
        }, format='json')
        self.assertEqual(confirm_resp.status_code, status.HTTP_400_BAD_REQUEST)
        # Custom exception handler wraps validation errors inside error.details
        self.assertIn('sui_object_id', confirm_resp.data['error']['details'])

    def test_transfer_batch_success(self):
        # Create a batch and confirm it first (so it's MINTED)
        self._authenticate(self.farmer)
        prepare_resp = self.client.post(self.prepare_url, {
            'origin_telemetry': str(self.telemetry.id),
            'crop_type': 'Maize',
            'weight_kg': 100.5
        }, format='json')
        batch_id = prepare_resp.data['id']
        confirm_url = f'/api/v1/ledger/{batch_id}/confirm/'
        self.client.post(confirm_url, {
            'sui_object_id': '0x123abcdef123456789'
        }, format='json')
        # Now transfer from farmer to logistics
        transfer_url = f'/api/v1/ledger/{batch_id}/transfer/'
        self._authenticate(self.logistics)  # logistics is the new custodian
        transfer_resp = self.client.post(transfer_url, {}, format='json')
        self.assertEqual(transfer_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(transfer_resp.data['status'], 'IN_TRANSIT')
        self.assertEqual(transfer_resp.data['current_custodian'], str(self.logistics.id))
        # Verify in DB
        batch = ProduceBatch.objects.get(id=batch_id)
        self.assertEqual(batch.status, ProduceBatch.Status.IN_TRANSIT)
        self.assertEqual(batch.current_custodian, self.logistics)

    def test_transfer_batch_wrong_user_forbidden(self):
        # Create a batch and confirm
        self._authenticate(self.farmer)
        prepare_resp = self.client.post(self.prepare_url, {
            'origin_telemetry': str(self.telemetry.id),
            'crop_type': 'Maize',
            'weight_kg': 100.5
        }, format='json')
        batch_id = prepare_resp.data['id']
        confirm_url = f'/api/v1/ledger/{batch_id}/confirm/'
        self.client.post(confirm_url, {
            'sui_object_id': '0x123abcdef123456789'
        }, format='json')
        # Admin tries to transfer (should be forbidden if permission is IsLogistics)
        self._authenticate(self.admin)
        transfer_url = f'/api/v1/ledger/{batch_id}/transfer/'
        transfer_resp = self.client.post(transfer_url, {}, format='json')
        self.assertEqual(transfer_resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_list_batch_access_control(self):
        # Create a batch for farmer
        self._authenticate(self.farmer)
        prepare_resp = self.client.post(self.prepare_url, {
            'origin_telemetry': str(self.telemetry.id),
            'crop_type': 'Maize',
            'weight_kg': 100.5
        }, format='json')
        batch_id = prepare_resp.data['id']
        # Farmer can list his own batches
        self._authenticate(self.farmer)
        list_resp = self.client.get(self.list_url, format='json')
        self.assertEqual(list_resp.status_code, status.HTTP_200_OK)
        # List is paginated (StandardPagination) → records under 'results'
        self.assertEqual(len(list_resp.data['results']), 1)
        self.assertEqual(list_resp.data['results'][0]['id'], batch_id)
        # Admin can list all
        self._authenticate(self.admin)
        list_resp = self.client.get(self.list_url, format='json')
        self.assertEqual(list_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(list_resp.data['results']), 1)
        # Logistics cannot list (IsFarmerOrAdmin)
        self._authenticate(self.logistics)
        list_resp = self.client.get(self.list_url, format='json')
        self.assertEqual(list_resp.status_code, status.HTTP_403_FORBIDDEN)

class BatchServiceTests(TestCase):
    def setUp(self):
        self.farmer = User.objects.create_user(
            email='farmer@example.com',
            password='Pass1234!',
            full_name='Farmer',
            role='FARMER'
        )
        self.telemetry = EnvironmentalTelemetry.objects.create(
            farmer=self.farmer,
            recorded_at=timezone.now(),
            temperature_celsius=25.0,
            soil_moisture_percentage=60.0,
            soil_ph=6.5,
            payload_sha256='abcd1234'
        )
        # Compute the real integrity hash from the linked telemetry record
        # (mirrors what BatchPrepareView writes to data_integrity_hash)
        integrity_hash = generate_telemetry_hash(
            farmer_id=self.farmer.id,
            recorded_at=self.telemetry.recorded_at,
            temperature=self.telemetry.temperature_celsius,
            soil_moisture=self.telemetry.soil_moisture_percentage,
            soil_ph=self.telemetry.soil_ph,
        )
        self.batch = ProduceBatch.objects.create(
            farmer=self.farmer,
            origin_telemetry=self.telemetry,
            crop_type='Maize',
            weight_kg=100.5,
            current_custodian=self.farmer,
            status=ProduceBatch.Status.PENDING,
            data_integrity_hash=integrity_hash,
        )

    def test_verify_integrity_returns_hash(self):
        # The verify_integrity function returns the recomputed hash
        recomputed = verify_integrity(self.batch)
        # We need to compute the expected hash using the same function from telemetry services
        expected = generate_telemetry_hash(
            farmer_id=self.farmer.id,
            recorded_at=self.telemetry.recorded_at,
            temperature=self.telemetry.temperature_celsius,
            soil_moisture=self.telemetry.soil_moisture_percentage,
            soil_ph=self.telemetry.soil_ph
        )
        self.assertEqual(recomputed, expected)
        # Since we set data_integrity_hash to the same as the telemetry hash, verification should match
        self.assertEqual(recomputed, self.batch.data_integrity_hash)

    def test_verify_integrity_no_telemetry(self):
        batch = ProduceBatch.objects.create(
            farmer=self.farmer,
            crop_type='Maize',
            weight_kg=100.5,
            current_custodian=self.farmer
            # no origin_telemetry
        )
        result = verify_integrity(batch)
        self.assertIsNone(result)