import base64
import hashlib

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase
from django.urls import reverse
from nacl.signing import SigningKey
from rest_framework import status
from rest_framework.test import APIClient

from .models import AuditEvent, WalletChallenge
from .views import derive_sui_address_from_pubkey, verify_sui_personal_message_signature


User = get_user_model()


def sign_personal_message(signing_key, message):
    message_bytes = message.encode("utf-8")
    length = len(message_bytes)
    encoded_length = bytearray()
    while True:
        byte = length & 0x7F
        length >>= 7
        if length:
            byte |= 0x80
        encoded_length.append(byte)
        if not length:
            break
    digest = hashlib.blake2b(
        bytes([3, 0, 0]) + bytes(encoded_length) + message_bytes,
        digest_size=32,
    ).digest()
    public_key = signing_key.verify_key.encode()
    signature = signing_key.sign(digest).signature
    return base64.b64encode(bytes([0]) + signature + public_key).decode("ascii")


class WalletChallengeSecurityTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.signing_key = SigningKey.generate()
        self.wallet = derive_sui_address_from_pubkey(self.signing_key.verify_key.encode())

    def _challenge(self):
        response = self.client.post(
            reverse("wallet_challenge"),
            {"wallet_address": self.wallet},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        return response.data

    def test_exact_signature_format_and_single_use_login(self):
        user = User.objects.create_user(
            email="wallet@example.com",
            password="StrongPass123!",
            full_name="Wallet User",
            role=User.Role.FARMER,
            sui_public_key=self.wallet,
        )
        challenge = self._challenge()
        signature = sign_personal_message(self.signing_key, challenge["message"])
        valid, address, _ = verify_sui_personal_message_signature(challenge["message"], signature)
        self.assertTrue(valid)
        self.assertEqual(address, self.wallet)

        oversized = base64.b64encode(base64.b64decode(signature) + b"x").decode("ascii")
        self.assertFalse(
            verify_sui_personal_message_signature(challenge["message"], oversized)[0]
        )

        payload = {"challenge_id": challenge["challenge_id"], "signature": signature}
        login = self.client.post(reverse("wallet_login"), payload, format="json")
        self.assertEqual(login.status_code, status.HTTP_200_OK)
        self.assertEqual(login.data["user"]["id"], str(user.pk))
        replay = self.client.post(reverse("wallet_login"), payload, format="json")
        self.assertEqual(replay.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            AuditEvent.objects.filter(event_type=AuditEvent.EventType.AUTH_SUCCESS).count(),
            1,
        )

    def test_authenticated_proof_binds_wallet(self):
        user = User.objects.create_user(
            email="bind@example.com",
            password="StrongPass123!",
            full_name="Bind User",
            role=User.Role.LOGISTICS,
        )
        self.client.force_authenticate(user)
        challenge = self._challenge()
        record = WalletChallenge.objects.get(pk=challenge["challenge_id"])
        self.assertEqual(record.purpose, WalletChallenge.Purpose.BIND)
        signature = sign_personal_message(self.signing_key, challenge["message"])
        response = self.client.post(
            reverse("wallet_login"),
            {"challenge_id": challenge["challenge_id"], "signature": signature},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        user.refresh_from_db()
        self.assertEqual(user.sui_public_key, self.wallet)

    def test_invalid_addresses_are_rejected(self):
        for wallet in ("0x1234", "not-an-address", "0x" + "gg" * 32):
            response = self.client.post(
                reverse("wallet_challenge"),
                {"wallet_address": wallet},
                format="json",
            )
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_valid_unknown_wallet_proof_is_consumed_without_login(self):
        challenge = self._challenge()
        signature = sign_personal_message(self.signing_key, challenge["message"])
        payload = {"challenge_id": challenge["challenge_id"], "signature": signature}
        response = self.client.post(reverse("wallet_login"), payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        record = WalletChallenge.objects.get(pk=challenge["challenge_id"])
        self.assertIsNotNone(record.used_at)
        replay = self.client.post(reverse("wallet_login"), payload, format="json")
        self.assertEqual(replay.status_code, status.HTTP_401_UNAUTHORIZED)


class PublicRegistrationSecurityTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_public_registration_cannot_create_admin_or_self_bind_wallet(self):
        admin_response = self.client.post(
            reverse("auth_register"),
            {
                "email": "admin@example.com",
                "password": "StrongPass123!",
                "full_name": "Admin",
                "role": User.Role.ADMIN,
            },
            format="json",
        )
        self.assertEqual(admin_response.status_code, status.HTTP_400_BAD_REQUEST)

        wallet = "0x" + "44" * 32
        farmer_response = self.client.post(
            reverse("auth_register"),
            {
                "email": "farmer@example.com",
                "password": "StrongPass123!",
                "full_name": "Farmer",
                "role": User.Role.FARMER,
                "sui_public_key": wallet,
            },
            format="json",
        )
        self.assertEqual(farmer_response.status_code, status.HTTP_201_CREATED)
        self.assertIsNone(User.objects.get(email="farmer@example.com").sui_public_key)
