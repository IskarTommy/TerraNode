import base64
import hashlib
import re
import secrets
from datetime import timedelta
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView
from nacl.signing import VerifyKey

from .models import AuditEvent, WalletChallenge
from .serializers import (
    AdminUserSerializer,
    StakeholderSerializer,
    RegisterSerializer,
    ProfileSerializer,
    CustomTokenObtainPairSerializer,
)
from .permissions import IsAdmin
from core.throttling import LoginRateThrottle

User = get_user_model()
SUI_ADDRESS_RE = re.compile(r"^0x[0-9a-fA-F]{64}$")


def _request_ip(request):
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR", "")
    return (forwarded.split(",")[0].strip() if forwarded else request.META.get("REMOTE_ADDR")) or None


def _audit_auth(request, event_type, description, wallet_address="", user=None, metadata=None):
    AuditEvent.objects.create(
        event_type=event_type,
        user=user,
        wallet_address=wallet_address,
        ip_address=_request_ip(request),
        description=description,
        metadata=metadata or {},
    )


def derive_sui_address_from_pubkey(pubkey_bytes: bytes, flag: int = 0) -> str:
    """Derives a standard Sui address (0x...) from Ed25519 public key bytes and scheme flag."""
    flag_byte = bytes([flag])
    data = flag_byte + pubkey_bytes
    digest = hashlib.blake2b(data, digest_size=32).hexdigest()
    return f"0x{digest}"


def verify_sui_personal_message_signature(message_str: str, signature_b64: str):
    """
    Verifies an Ed25519 Sui personal message signature.
    Returns (is_valid, derived_address, pubkey_hex).
    """
    try:
        sig_bytes = base64.b64decode(signature_b64, validate=True)
        if len(sig_bytes) != 97:
            return False, None, None

        flag = sig_bytes[0]
        if flag != 0:
            return False, None, None

        signature = sig_bytes[1:65]
        pubkey = sig_bytes[65:97]

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

        bcs_msg = to_uleb128(len(msg_bytes)) + msg_bytes
        intent_message = intent_prefix + bcs_msg

        hashed_msg = hashlib.blake2b(intent_message, digest_size=32).digest()

        verify_key = VerifyKey(pubkey)
        verify_key.verify(hashed_msg, signature)

        derived_address = derive_sui_address_from_pubkey(pubkey, flag=0)
        pubkey_hex = pubkey.hex()
        return True, derived_address, pubkey_hex
    except Exception:
        return False, None, None


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer
    throttle_classes = [LoginRateThrottle]


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = (AllowAny,)
    serializer_class = RegisterSerializer


class ProfileView(generics.RetrieveUpdateAPIView):
    permission_classes = (IsAuthenticated,)
    serializer_class = ProfileSerializer

    def get_object(self):
        return self.request.user


class AdminUserListView(generics.ListAPIView):
    permission_classes = (IsAdmin,)
    serializer_class = AdminUserSerializer

    def get_queryset(self):
        queryset = User.objects.all().order_by("-date_joined")
        role = self.request.query_params.get("role")
        search = self.request.query_params.get("search")
        if role:
            queryset = queryset.filter(role=role)
        if search:
            queryset = queryset.filter(email__icontains=search)
        return queryset


class StakeholderListView(generics.ListAPIView):
    permission_classes = (IsAuthenticated,)
    serializer_class = StakeholderSerializer
    pagination_class = None

    def get_queryset(self):
        return (
            User.objects.filter(
                is_active=True,
                role__in=[User.Role.FARMER, User.Role.LOGISTICS],
                sui_public_key__isnull=False,
            )
            .exclude(pk=self.request.user.pk)
            .order_by("full_name")
        )


class LogoutView(APIView):
    permission_classes = (IsAuthenticated,)

    def post(self, request):
        try:
            refresh_token = request.data.get("refresh")
            if not refresh_token:
                return Response({"error": "Refresh token is required"}, status=status.HTTP_400_BAD_REQUEST)

            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response({"success": True}, status=status.HTTP_205_RESET_CONTENT)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class RequestWalletChallengeView(APIView):
    permission_classes = (AllowAny,)
    throttle_classes = [LoginRateThrottle]

    def post(self, request):
        wallet_address = request.data.get('wallet_address')
        if not isinstance(wallet_address, str) or not SUI_ADDRESS_RE.fullmatch(wallet_address):
            return Response(
                {"error": "wallet_address must be 0x followed by exactly 64 hexadecimal characters"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        wallet_address = wallet_address.lower()
        registered_user = User.objects.filter(sui_public_key__iexact=wallet_address).first()
        authenticated_user = request.user if request.user.is_authenticated else None
        if authenticated_user:
            if registered_user and registered_user.pk != authenticated_user.pk:
                return Response(
                    {"error": "Wallet is already bound to another account."},
                    status=status.HTTP_409_CONFLICT,
                )
            if (
                authenticated_user.sui_public_key
                and authenticated_user.sui_public_key.lower() != wallet_address
            ):
                return Response(
                    {"error": "Wallet rotation requires an administrator-assisted recovery process."},
                    status=status.HTTP_409_CONFLICT,
                )

        nonce = secrets.token_hex(32)
        domain = "TerraNode Auth"
        purpose = (
            WalletChallenge.Purpose.BIND
            if authenticated_user and not authenticated_user.sui_public_key
            else WalletChallenge.Purpose.AUTHENTICATE
        )
        now = timezone.now()
        expires_at = now + timedelta(minutes=5)

        message = (
            f"TerraNode Authentication Challenge\n"
            f"Domain: {domain}\n"
            f"Purpose: {purpose}\n"
            f"Wallet: {wallet_address}\n"
            f"Nonce: {nonce}\n"
            f"Issued: {now.isoformat()}\n"
            f"Expires: {expires_at.isoformat()}"
        )

        user = authenticated_user or registered_user

        challenge = WalletChallenge.objects.create(
            wallet_address=wallet_address,
            nonce=nonce,
            domain=domain,
            purpose=purpose,
            message=message,
            expires_at=expires_at,
            user=user
        )

        return Response({
            "challenge_id": str(challenge.id),
            "nonce": challenge.nonce,
            "message": challenge.message,
            "expires_at": challenge.expires_at.isoformat()
        })


class WalletLoginView(APIView):
    permission_classes = (AllowAny,)
    throttle_classes = [LoginRateThrottle]

    def post(self, request):
        challenge_id = request.data.get('challenge_id')
        signature = request.data.get('signature')

        if not challenge_id or not signature:
            return Response({"error": "challenge_id and signature are required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            challenge = WalletChallenge.objects.select_related("user").get(id=challenge_id)
        except (WalletChallenge.DoesNotExist, ValueError):
            _audit_auth(
                request,
                AuditEvent.EventType.AUTH_FAILURE,
                "Wallet login rejected: invalid challenge identifier",
            )
            return Response({"error": "Invalid challenge identifier"}, status=status.HTTP_401_UNAUTHORIZED)

        if not challenge.is_valid():
            return Response({"error": "Challenge expired or already consumed"}, status=status.HTTP_401_UNAUTHORIZED)

        is_valid, derived_address, pubkey_hex = verify_sui_personal_message_signature(challenge.message, signature)
        if not is_valid or not derived_address:
            _audit_auth(
                request,
                AuditEvent.EventType.AUTH_FAILURE,
                "Wallet login rejected: invalid signature",
                wallet_address=challenge.wallet_address,
                user=challenge.user,
                metadata={"challenge_id": str(challenge.id)},
            )
            return Response({"error": "Invalid cryptographic signature"}, status=status.HTTP_401_UNAUTHORIZED)

        if derived_address.lower() != challenge.wallet_address.lower():
            _audit_auth(
                request,
                AuditEvent.EventType.AUTH_FAILURE,
                "Wallet login rejected: signer address mismatch",
                wallet_address=challenge.wallet_address,
                user=challenge.user,
                metadata={"challenge_id": str(challenge.id)},
            )
            return Response({"error": "Derived signer address does not match challenged wallet address"}, status=status.HTTP_401_UNAUTHORIZED)

        consumed_at = timezone.now()
        with transaction.atomic():
            consumed = WalletChallenge.objects.filter(
                pk=challenge.pk,
                used_at__isnull=True,
                expires_at__gt=consumed_at,
            ).update(used_at=consumed_at)
            if consumed != 1:
                return Response(
                    {"error": "Challenge expired or already consumed"},
                    status=status.HTTP_401_UNAUTHORIZED,
                )

            if challenge.purpose == WalletChallenge.Purpose.BIND:
                if not challenge.user_id:
                    return Response(
                        {"error": "Wallet-binding challenge has no authenticated account."},
                        status=status.HTTP_401_UNAUTHORIZED,
                    )
                user = User.objects.select_for_update().get(pk=challenge.user_id)
                if user.sui_public_key and user.sui_public_key.lower() != challenge.wallet_address:
                    return Response(
                        {"error": "Account wallet binding changed before challenge completion."},
                        status=status.HTTP_409_CONFLICT,
                    )
                try:
                    user.sui_public_key = challenge.wallet_address
                    user.save(update_fields=["sui_public_key"])
                except IntegrityError:
                    return Response(
                        {"error": "Wallet is already bound to another account."},
                        status=status.HTTP_409_CONFLICT,
                    )
            else:
                user = User.objects.filter(
                    sui_public_key__iexact=challenge.wallet_address,
                    is_active=True,
                ).first()
                if not user:
                    _audit_auth(
                        request,
                        AuditEvent.EventType.AUTH_FAILURE,
                        "Valid wallet proof has no active TerraNode account",
                        wallet_address=challenge.wallet_address,
                        metadata={"challenge_id": str(challenge.id)},
                    )
                    return Response(
                        {"error": "Wallet address not registered to an active TerraNode account"},
                        status=status.HTTP_404_NOT_FOUND,
                    )

        refresh = RefreshToken.for_user(user)
        _audit_auth(
            request,
            AuditEvent.EventType.AUTH_SUCCESS,
            "Wallet authentication succeeded",
            wallet_address=challenge.wallet_address,
            user=user,
            metadata={
                "challenge_id": str(challenge.id),
                "purpose": challenge.purpose,
                "public_key_fingerprint": hashlib.sha256(bytes.fromhex(pubkey_hex)).hexdigest()[:16],
            },
        )
        return Response({
            'refresh': str(refresh),
            'access': str(refresh.access_token),
            'user': {
                'id': str(user.id),
                'email': user.email,
                'role': user.role,
                'full_name': user.full_name,
                'sui_public_key': user.sui_public_key
            }
        })
