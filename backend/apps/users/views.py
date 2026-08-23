from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView
from django.contrib.auth import get_user_model

from .serializers import RegisterSerializer, ProfileSerializer, CustomTokenObtainPairSerializer
from core.throttling import LoginRateThrottle

User = get_user_model()

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

import base64
import hashlib
from nacl.signing import VerifyKey
from nacl.exceptions import BadSignatureError

def verify_sui_personal_message(message_str, signature_b64):
    try:
        sig_bytes = base64.b64decode(signature_b64)
        flag = sig_bytes[0]
        if flag != 0:
            return False # Only Ed25519
        
        signature = sig_bytes[1:65]
        pubkey = sig_bytes[65:]
        
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
        return True
    except Exception:
        return False

class WalletLoginView(APIView):
    permission_classes = (AllowAny,)
    
    def post(self, request):
        sui_public_key = request.data.get('sui_public_key')
        message = request.data.get('message')
        signature = request.data.get('signature')

        if not sui_public_key or not message or not signature:
            return Response({"error": "Missing parameters"}, status=status.HTTP_400_BAD_REQUEST)

        # Verify signature
        if not verify_sui_personal_message(message, signature):
            return Response({"error": "Invalid signature"}, status=status.HTTP_401_UNAUTHORIZED)

        # Ensure the message is what we expect for login
        if message != f"Login to TerraNode with {sui_public_key}":
            return Response({"error": "Invalid message context"}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            user = User.objects.get(sui_public_key=sui_public_key)
        except User.DoesNotExist:
            return Response({"error": "Wallet not registered"}, status=status.HTTP_404_NOT_FOUND)

        refresh = RefreshToken.for_user(user)
        return Response({
            'refresh': str(refresh),
            'access': str(refresh.access_token),
            'user': {
                'id': user.id,
                'email': user.email,
                'role': user.role,
                'sui_public_key': user.sui_public_key,
                'company_name': user.company_name
            }
        })
