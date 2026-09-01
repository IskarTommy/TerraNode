import base64
import hashlib
import secrets
from datetime import timedelta
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.db.models import Q
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView
from nacl.signing import VerifyKey

from .models import AuditEvent, WalletChallenge
from .permissions import IsAdmin
from .serializers import (
    AdminUserSerializer, CustomTokenObtainPairSerializer,
    ProfileSerializer, RegisterSerializer
)
from core.throttling import LoginRateThrottle

User = get_user_model()


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
        sig_bytes = base64.b64decode(signature_b64)
        if len(sig_bytes) < 97:
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
        if not wallet_address or not wallet_address.startswith('0x'):
            return Response({"error": "Valid wallet_address starting with 0x is required"}, status=status.HTTP_400_BAD_REQUEST)

        wallet_address = wallet_address.lower()
        nonce = secrets.token_hex(32)
        domain = "TerraNode Auth"
        now = timezone.now()
        expires_at = now + timedelta(minutes=5)

        message = (
            f"TerraNode Authentication Challenge\n"
            f"Domain: {domain}\n"
            f"Wallet: {wallet_address}\n"
            f"Nonce: {nonce}\n"
            f"Issued: {now.isoformat()}\n"
            f"Expires: {expires_at.isoformat()}"
        )

        user = User.objects.filter(sui_public_key__iexact=wallet_address).first()

        challenge = WalletChallenge.objects.create(
            wallet_address=wallet_address,
            nonce=nonce,
            domain=domain,
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
            challenge = WalletChallenge.objects.get(id=challenge_id)
        except (WalletChallenge.DoesNotExist, ValueError):
            return Response({"error": "Invalid challenge identifier"}, status=status.HTTP_401_UNAUTHORIZED)

        if not challenge.is_valid():
            return Response({"error": "Challenge expired or already consumed"}, status=status.HTTP_401_UNAUTHORIZED)

        is_valid, derived_address, pubkey_hex = verify_sui_personal_message_signature(challenge.message, signature)
        if not is_valid or not derived_address:
            return Response({"error": "Invalid cryptographic signature"}, status=status.HTTP_401_UNAUTHORIZED)

        if derived_address.lower() != challenge.wallet_address.lower():
            return Response({"error": "Derived signer address does not match challenged wallet address"}, status=status.HTTP_401_UNAUTHORIZED)

        challenge.used_at = timezone.now()
        challenge.save()

        user = User.objects.filter(sui_public_key__iexact=challenge.wallet_address).first()
        if not user:
            return Response({"error": "Wallet address not registered to any TerraNode account"}, status=status.HTTP_404_NOT_FOUND)

        refresh = RefreshToken.for_user(user)
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


class AdminUserListView(generics.ListAPIView):
    permission_classes = (IsAdmin,)
    serializer_class = AdminUserSerializer

    def get_queryset(self):
        queryset = User.objects.all().order_by('-date_joined')
        role = self.request.query_params.get('role')
        search = self.request.query_params.get('search')
        is_active = self.request.query_params.get('is_active')
        if role:
            queryset = queryset.filter(role=role.upper())
        if search:
            queryset = queryset.filter(Q(email__icontains=search) | Q(full_name__icontains=search))
        if is_active in ('true', 'false'):
            queryset = queryset.filter(is_active=is_active == 'true')
        return queryset


class AdminUserDetailView(generics.RetrieveUpdateAPIView):
    permission_classes = (IsAdmin,)
    serializer_class = AdminUserSerializer
    queryset = User.objects.all()

    def perform_update(self, serializer):
        user = serializer.save()
        AuditEvent.objects.create(
            event_type=AuditEvent.EventType.ADMIN_ACTION,
            user=self.request.user,
            description=f"Administrator updated user {user.email}",
            metadata={"target_user_id": str(user.id), "role": user.role, "is_active": user.is_active},
        )


class AuditEventListView(generics.ListAPIView):
    permission_classes = (IsAdmin,)

    def get(self, request, *args, **kwargs):
        events = AuditEvent.objects.select_related('user').all()[:200]
        return Response({
            "count": AuditEvent.objects.count(),
            "next": None,
            "previous": None,
            "results": [{
                "id": str(event.id),
                "action": event.event_type,
                "description": event.description,
                "user": event.user.email if event.user else None,
                "user_id": str(event.user_id) if event.user_id else None,
                "timestamp": event.timestamp,
                "ip_address": event.ip_address,
                "metadata": event.metadata,
            } for event in events],
        })
