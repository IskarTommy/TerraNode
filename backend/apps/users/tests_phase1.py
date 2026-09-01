import base64
import hashlib
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from nacl.signing import SigningKey

from apps.ledger.models import ProduceBatch, CustodyTransfer
from apps.users.models import WalletChallenge, CustomUser

User = get_user_model()

class Phase1SecurityTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        self.farmer = User.objects.create_user(
            email="farmer1@example.com",
            password="Password123!",
            full_name="Farmer One",
            role=CustomUser.Role.FARMER,
            sui_public_key="0x1111111111111111111111111111111111111111111111111111111111111111"
        )

        self.logistics1 = User.objects.create_user(
            email="logistics1@example.com",
            password="Password123!",
            full_name="Logistics One",
            role=CustomUser.Role.LOGISTICS,
            sui_public_key="0x2222222222222222222222222222222222222222222222222222222222222222"
        )

        self.logistics_no_wallet = User.objects.create_user(
            email="logistics_no_wallet@example.com",
            password="Password123!",
            full_name="Logistics No Wallet",
            role=CustomUser.Role.LOGISTICS,
            sui_public_key=""
        )

        self.unrelated_user = User.objects.create_user(
            email="unrelated@example.com",
            password="Password123!",
            full_name="Unrelated User",
            role=CustomUser.Role.FARMER,
            sui_public_key="0x3333333333333333333333333333333333333333333333333333333333333333"
        )

        self.batch = ProduceBatch.objects.create(
            farmer=self.farmer,
            crop_type="MAIZE",
            weight_kg=100.50,
            current_custodian=self.farmer,
            status=ProduceBatch.Status.MINTED,
            sui_object_id="0xbatchobject111"
        )

    def test_unrelated_user_cannot_view_or_transfer_batch(self):
        self.client.force_authenticate(user=self.unrelated_user)

        response = self.client.get(reverse("batch_detail", kwargs={"pk": self.batch.id}))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

        transfer_url = reverse("batch_transfer", kwargs={"pk": self.batch.id})
        payload = {
            "to_user_id": str(self.logistics1.id),
            "status": ProduceBatch.Status.IN_TRANSIT
        }
        response = self.client.post(transfer_url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_custody_transfer_lifecycle_and_persistent_record(self):
        self.client.force_authenticate(user=self.farmer)
        transfer_url = reverse("batch_transfer", kwargs={"pk": self.batch.id})

        fail_payload = {"to_user_id": str(self.logistics_no_wallet.id), "status": ProduceBatch.Status.IN_TRANSIT}
        res_fail = self.client.post(transfer_url, fail_payload, format="json")
        self.assertEqual(res_fail.status_code, status.HTTP_400_BAD_REQUEST)

        success_payload = {
            "to_user_id": str(self.logistics1.id),
            "status": ProduceBatch.Status.IN_TRANSIT
        }
        res_success = self.client.post(transfer_url, success_payload, format="json")
        self.assertEqual(res_success.status_code, status.HTTP_200_OK)

        self.batch.refresh_from_db()
        self.assertEqual(self.batch.current_custodian, self.logistics1)
        self.assertEqual(self.batch.status, ProduceBatch.Status.IN_TRANSIT)

        transfer_record = CustodyTransfer.objects.filter(batch=self.batch).first()
        self.assertIsNotNone(transfer_record)
        self.assertEqual(transfer_record.from_user, self.farmer)
        self.assertEqual(transfer_record.to_user, self.logistics1)

    def test_wallet_challenge_flow_and_signature_verification(self):
        signing_key = SigningKey.generate()
        verify_key = signing_key.verify_key
        pubkey_bytes = verify_key.encode()

        flag_byte = bytes([0])
        data = flag_byte + pubkey_bytes
        wallet_address = f"0x{hashlib.blake2b(data, digest_size=32).hexdigest()}"

        sui_user = User.objects.create_user(
            email="sui_user@example.com",
            password="Password123!",
            full_name="Sui User",
            role=CustomUser.Role.FARMER,
            sui_public_key=wallet_address
        )

        challenge_res = self.client.post(reverse("wallet_challenge"), {"wallet_address": wallet_address}, format="json")
        self.assertEqual(challenge_res.status_code, status.HTTP_200_OK)
        challenge_id = challenge_res.data["challenge_id"]
        message_str = challenge_res.data["message"]

        intent_prefix = bytes([3, 0, 0])
        msg_bytes = message_str.encode('utf-8')

        def to_uleb128(n):
            result = bytearray()
            while True:
                byte = n & 0x7f
                n >>= 7
                if n != 0:
                    byte |= 0x80
                result.append(byte)
                if n == 0:
                    break
            return bytes(result)

        intent_message = intent_prefix + to_uleb128(len(msg_bytes)) + msg_bytes
        hashed_msg = hashlib.blake2b(intent_message, digest_size=32).digest()

        sig_bytes = signing_key.sign(hashed_msg).signature
        sui_sig_bytes = flag_byte + sig_bytes + pubkey_bytes
        signature_b64 = base64.b64encode(sui_sig_bytes).decode('utf-8')

        login_res = self.client.post(reverse("wallet_login"), {
            "challenge_id": challenge_id,
            "signature": signature_b64
        }, format="json")

        self.assertEqual(login_res.status_code, status.HTTP_200_OK)
        self.assertIn("access", login_res.data)
        self.assertEqual(login_res.data["user"]["email"], "sui_user@example.com")

        replay_res = self.client.post(reverse("wallet_login"), {
            "challenge_id": challenge_id,
            "signature": signature_b64
        }, format="json")
        self.assertEqual(replay_res.status_code, status.HTTP_401_UNAUTHORIZED)
