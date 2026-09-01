from unittest.mock import patch
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from apps.ledger.models import ProduceBatch
from apps.ledger.services import verify_sui_transaction_on_rpc

User = get_user_model()

class Phase4SuiVerificationTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.farmer = User.objects.create_user(
            email="sui_farmer@example.com",
            password="Password123!",
            full_name="Sui Farmer",
            role="FARMER",
            sui_public_key="0x1111111111111111111111111111111111111111111111111111111111111111"
        )
        self.batch = ProduceBatch.objects.create(
            farmer=self.farmer,
            crop_type="MAIZE",
            weight_kg=50.0,
            current_custodian=self.farmer,
            status=ProduceBatch.Status.PENDING,
            data_integrity_hash="hash123"
        )

    def test_simulated_tx_digest_rejected(self):
        res = verify_sui_transaction_on_rpc("SIMULATED_TX_12345")
        self.assertFalse(res["verified"])
        self.assertIn("SIMULATED_TX digests are strictly forbidden", res["error"])

    @patch("urllib.request.urlopen")
    def test_rpc_verification_success_and_fail_closed_public_verify(self, mock_urlopen):
        mock_resp = patch('urllib.request.urlopen').start()
        mock_resp.return_value.__enter__.return_value.read.return_value = b'''{
            "jsonrpc": "2.0",
            "id": 1,
            "result": {
                "effects": {"status": {"status": "success"}},
                "transaction": {"data": {"sender": "0x1111111111111111111111111111111111111111111111111111111111111111"}},
                "objectChanges": [{"type": "created", "objectType": "0x123::agri_ledger::ProduceBatch", "objectId": "0xVERIFIED_OBJ_999"}]
            }
        }'''

        rpc_res = verify_sui_transaction_on_rpc("0xvalidtx12345", expected_sender=self.farmer.sui_public_key)
        self.assertTrue(rpc_res["verified"])
        self.assertEqual(rpc_res["object_id"], "0xVERIFIED_OBJ_999")

        self.client.force_authenticate(user=self.farmer)
        confirm_url = reverse("batch_confirm", kwargs={"pk": self.batch.id})
        confirm_res = self.client.post(confirm_url, {
            "sui_object_id": "0xVERIFIED_OBJ_999",
            "sui_tx_digest": "0xvalidtx12345"
        }, format="json")

        self.assertEqual(confirm_res.status_code, status.HTTP_200_OK)
        self.assertEqual(confirm_res.data["sui_object_id"], "0xVERIFIED_OBJ_999")

        public_url = reverse("public_batch_verify", kwargs={"identifier": "0xVERIFIED_OBJ_999"})
        public_res = self.client.get(public_url)
        self.assertEqual(public_res.status_code, status.HTTP_200_OK)
        self.assertTrue(public_res.data["verified"])
        self.assertTrue(public_res.data["sui_tx_verified"])

        patch.stopall()

    def test_replayed_digest_rejected(self):
        self.batch.sui_tx_digest = "0xused_digest_123"
        self.batch.status = ProduceBatch.Status.MINTED
        self.batch.save()

        new_batch = ProduceBatch.objects.create(
            farmer=self.farmer,
            crop_type="RICE",
            weight_kg=20.0,
            current_custodian=self.farmer,
            status=ProduceBatch.Status.PENDING
        )

        self.client.force_authenticate(user=self.farmer)
        confirm_url = reverse("batch_confirm", kwargs={"pk": new_batch.id})
        res = self.client.post(confirm_url, {
            "sui_object_id": "0xnewobj123",
            "sui_tx_digest": "0xused_digest_123"
        }, format="json")

        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("already been consumed", res.data["error"])
