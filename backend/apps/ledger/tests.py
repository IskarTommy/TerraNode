import os
from decimal import Decimal
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from .models import CustodyTransfer, ProduceBatch
from .services import (
    DEFAULT_PACKAGE_ID,
    DEFAULT_TESTNET_CHAIN_ID,
    verify_sui_transaction_on_rpc,
)


User = get_user_model()
FARMER_WALLET = "0x" + "11" * 32
LOGISTICS_WALLET = "0x" + "22" * 32
OBJECT_ID = "0x" + "33" * 32


class StrictLedgerWorkflowTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.farmer = User.objects.create_user(
            email="farmer@example.com",
            password="Pass1234!",
            full_name="Farmer",
            role=User.Role.FARMER,
            sui_public_key=FARMER_WALLET,
        )
        self.logistics = User.objects.create_user(
            email="logistics@example.com",
            password="Pass1234!",
            full_name="Logistics",
            role=User.Role.LOGISTICS,
            sui_public_key=LOGISTICS_WALLET,
        )
        self.batch = ProduceBatch.objects.create(
            farmer=self.farmer,
            crop_type="Maize",
            weight_kg=Decimal("10.125"),
            current_custodian=self.farmer,
            data_integrity_hash="ab" * 32,
        )
        self.client.force_authenticate(self.farmer)

    def _verification(self, digest, function, object_id=OBJECT_ID):
        return {
            "verified": True,
            "reason_code": "verified",
            "digest": digest,
            "chain_id": DEFAULT_TESTNET_CHAIN_ID,
            "sender": FARMER_WALLET,
            "object_id": object_id,
            "package_id": DEFAULT_PACKAGE_ID,
            "module": "agri_ledger",
            "function": function,
        }

    def test_confirm_requires_digest_and_never_trusts_client_object_id(self):
        url = reverse("batch_confirm", kwargs={"pk": self.batch.pk})
        missing = self.client.post(url, {"sui_object_id": "0xclient"}, format="json")
        self.assertEqual(missing.status_code, status.HTTP_400_BAD_REQUEST)
        self.batch.refresh_from_db()
        self.assertEqual(self.batch.status, ProduceBatch.Status.PENDING)

        digest = "mint-digest-1"
        with patch(
            "apps.ledger.views.verify_sui_transaction_on_rpc",
            return_value=self._verification(digest, "mint_batch"),
        ):
            confirmed = self.client.post(
                url,
                {"sui_tx_digest": digest, "sui_object_id": "0xuntrusted"},
                format="json",
            )
        self.assertEqual(confirmed.status_code, status.HTTP_200_OK)
        self.batch.refresh_from_db()
        self.assertEqual(self.batch.sui_object_id, OBJECT_ID)
        self.assertEqual(self.batch.sui_tx_digest, digest)
        self.assertEqual(self.batch.status, ProduceBatch.Status.MINTED)
        self.assertIsNotNone(self.batch.mint_verified_at)

    def test_rpc_outage_and_invalid_transaction_leave_batch_pending(self):
        url = reverse("batch_confirm", kwargs={"pk": self.batch.pk})
        for result, expected_status in (
            (
                {"verified": False, "reason_code": "rpc_unavailable", "error": "offline"},
                status.HTTP_503_SERVICE_UNAVAILABLE,
            ),
            (
                {"verified": False, "reason_code": "verification_failed", "error": "wrong package"},
                status.HTTP_400_BAD_REQUEST,
            ),
        ):
            with patch("apps.ledger.views.verify_sui_transaction_on_rpc", return_value=result):
                response = self.client.post(
                    url,
                    {"sui_tx_digest": f"digest-{expected_status}"},
                    format="json",
                )
            self.assertEqual(response.status_code, expected_status)
            self.batch.refresh_from_db()
            self.assertEqual(self.batch.status, ProduceBatch.Status.PENDING)
            self.assertIsNone(self.batch.sui_object_id)

    def test_transfer_requires_verified_digest_and_preserves_mint_digest(self):
        self.batch.status = ProduceBatch.Status.MINTED
        self.batch.sui_object_id = OBJECT_ID
        self.batch.sui_tx_digest = "mint-digest"
        self.batch.save()
        url = reverse("batch_transfer", kwargs={"pk": self.batch.pk})

        missing = self.client.post(
            url,
            {"to_user_id": str(self.logistics.pk)},
            format="json",
        )
        self.assertEqual(missing.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(CustodyTransfer.objects.exists())

        digest = "transfer-digest"
        with patch(
            "apps.ledger.views.verify_sui_transaction_on_rpc",
            return_value=self._verification(digest, "transfer_custody"),
        ):
            response = self.client.post(
                url,
                {
                    "to_user_id": str(self.logistics.pk),
                    "sui_tx_digest": digest,
                    "status": ProduceBatch.Status.IN_TRANSIT,
                },
                format="json",
            )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.batch.refresh_from_db()
        self.assertEqual(self.batch.current_custodian, self.logistics)
        self.assertEqual(self.batch.sui_tx_digest, "mint-digest")
        transfer = CustodyTransfer.objects.get()
        self.assertEqual(transfer.tx_digest, digest)
        self.assertTrue(transfer.verified_on_chain)

    def test_transfer_rpc_outage_does_not_change_custody(self):
        self.batch.status = ProduceBatch.Status.MINTED
        self.batch.sui_object_id = OBJECT_ID
        self.batch.sui_tx_digest = "mint-digest"
        self.batch.save()
        with patch(
            "apps.ledger.views.verify_sui_transaction_on_rpc",
            return_value={"verified": False, "reason_code": "rpc_unavailable", "error": "offline"},
        ):
            response = self.client.post(
                reverse("batch_transfer", kwargs={"pk": self.batch.pk}),
                {
                    "to_user_id": str(self.logistics.pk),
                    "sui_tx_digest": "transfer-digest",
                },
                format="json",
            )
        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
        self.batch.refresh_from_db()
        self.assertEqual(self.batch.current_custodian, self.farmer)
        self.assertFalse(CustodyTransfer.objects.exists())

    def test_only_current_custodian_can_transfer_and_self_transfer_is_rejected(self):
        self.batch.status = ProduceBatch.Status.MINTED
        self.batch.sui_object_id = OBJECT_ID
        self.batch.sui_tx_digest = "mint-digest"
        self.batch.save()
        url = reverse("batch_transfer", kwargs={"pk": self.batch.pk})
        self.client.force_authenticate(self.logistics)
        forbidden = self.client.post(
            url,
            {"to_user_id": str(self.farmer.pk), "sui_tx_digest": "digest-a"},
            format="json",
        )
        self.assertEqual(forbidden.status_code, status.HTTP_403_FORBIDDEN)
        self.client.force_authenticate(self.farmer)
        self_transfer = self.client.post(
            url,
            {"to_user_id": str(self.farmer.pk), "sui_tx_digest": "digest-b"},
            format="json",
        )
        self.assertEqual(self_transfer.status_code, status.HTTP_400_BAD_REQUEST)

    def test_public_verification_fails_closed_without_chain_anchor(self):
        response = self.client.get(
            reverse("public_batch_verify", kwargs={"identifier": str(self.batch.pk)})
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data["verified"])
        self.assertFalse(response.data["sui_tx_verified"])


class StrictSuiVerifierTests(TestCase):
    def setUp(self):
        self.farmer = User.objects.create_user(
            email="rpc@example.com",
            password="Pass1234!",
            full_name="RPC Farmer",
            role=User.Role.FARMER,
            sui_public_key=FARMER_WALLET,
        )
        self.batch = ProduceBatch.objects.create(
            farmer=self.farmer,
            crop_type="Maize",
            weight_kg=Decimal("10.125"),
            current_custodian=self.farmer,
            data_integrity_hash="ab" * 32,
        )

    def _transaction(self, function="mint_batch"):
        return {
            "effects": {"status": {"status": "success"}},
            "transaction": {
                "data": {
                    "sender": FARMER_WALLET,
                    "transaction": {
                        "transactions": [
                            {
                                "MoveCall": {
                                    "package": DEFAULT_PACKAGE_ID,
                                    "module": "agri_ledger",
                                    "function": function,
                                }
                            }
                        ]
                    },
                }
            },
            "objectChanges": [
                {
                    "type": "created",
                    "objectType": f"{DEFAULT_PACKAGE_ID}::agri_ledger::ProduceBatch",
                    "objectId": OBJECT_ID,
                }
            ],
            "events": [
                {
                    "type": f"{DEFAULT_PACKAGE_ID}::agri_ledger::BatchMinted",
                    "parsedJson": {
                        "batch_id": OBJECT_ID,
                        "farmer": FARMER_WALLET,
                        "crop_type": "Maize",
                        "weight_grams": "10125",
                        "data_integrity_hash": list(bytes.fromhex("ab" * 32)),
                    },
                }
            ],
        }

    def _object(self):
        return {
            "data": {
                "type": f"{DEFAULT_PACKAGE_ID}::agri_ledger::ProduceBatch",
                "owner": {"AddressOwner": FARMER_WALLET},
                "content": {
                    "fields": {
                        "crop_type": "Maize",
                        "weight_grams": "10125",
                        "origin_farmer_address": FARMER_WALLET,
                        "current_custodian_address": FARMER_WALLET,
                        "data_integrity_hash": list(bytes.fromhex("ab" * 32)),
                    }
                },
            }
        }

    @patch.dict(
        os.environ,
        {
            "SUI_PACKAGE_ID": DEFAULT_PACKAGE_ID,
            "SUI_TESTNET_CHAIN_ID": DEFAULT_TESTNET_CHAIN_ID,
        },
    )
    def test_verifier_requires_exact_move_call_event_and_final_object(self):
        with patch(
            "apps.ledger.services._rpc_call",
            side_effect=[DEFAULT_TESTNET_CHAIN_ID, self._transaction(), self._object()],
        ):
            result = verify_sui_transaction_on_rpc(
                "real-digest",
                expected_sender=FARMER_WALLET,
                expected_function="mint_batch",
                expected_batch=self.batch,
            )
        self.assertTrue(result["verified"])
        self.assertEqual(result["object_id"], OBJECT_ID)

        with patch(
            "apps.ledger.services._rpc_call",
            side_effect=[DEFAULT_TESTNET_CHAIN_ID, self._transaction("other_function")],
        ):
            wrong_call = verify_sui_transaction_on_rpc(
                "real-digest-2",
                expected_sender=FARMER_WALLET,
                expected_function="mint_batch",
                expected_batch=self.batch,
            )
        self.assertFalse(wrong_call["verified"])
        self.assertIn("does not call", wrong_call["error"])
