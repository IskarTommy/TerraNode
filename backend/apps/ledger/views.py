import hashlib
import json

from rest_framework import generics, serializers, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.shortcuts import get_object_or_404
from django.db import IntegrityError, transaction
from django.core.exceptions import ImproperlyConfigured
from django.db.models import Q
from django.utils import timezone
from django.contrib.auth import get_user_model
from apps.users.permissions import IsFarmer
from apps.telemetry.encryption_service import read_telemetry_values
from apps.users.models import AuditEvent
from .models import ProduceBatch, CustodyTransfer
from .serializers import (
    BatchConfirmSerializer,
    BatchOutputSerializer,
    BatchPrepareSerializer,
    BatchTransferInputSerializer,
    CustodyTransferSerializer,
)
from .services import verify_sui_transaction_on_rpc

User = get_user_model()

ALLOWED_LIFECYCLE_TRANSITIONS = {
    ProduceBatch.Status.PENDING: [ProduceBatch.Status.MINTED],
    ProduceBatch.Status.MINTED: [ProduceBatch.Status.IN_TRANSIT],
    ProduceBatch.Status.IN_TRANSIT: [ProduceBatch.Status.IN_TRANSIT, ProduceBatch.Status.DELIVERED],
    ProduceBatch.Status.DELIVERED: []
}


def _rpc_failure_response(result, operation):
    http_status = (
        status.HTTP_503_SERVICE_UNAVAILABLE
        if result.get("reason_code") == "rpc_unavailable"
        else status.HTTP_400_BAD_REQUEST
    )
    return Response(
        {
            "error": f"Sui Testnet {operation} verification failed",
            "reason": result.get("error", "Unknown verification failure"),
            "reason_code": result.get("reason_code", "verification_failed"),
        },
        status=http_status,
    )

class BatchPrepareView(generics.CreateAPIView):
    """Step 1: Farmer stages a produce batch record in PENDING state before calling Sui Move contract."""
    permission_classes = (IsFarmer,)
    serializer_class = BatchPrepareSerializer

    def perform_create(self, serializer):
        farmer = self.request.user
        telemetry = serializer.validated_data.get('origin_telemetry')
        if telemetry:
            if telemetry.farmer_id != farmer.id:
                raise serializers.ValidationError(
                    {"origin_telemetry": "A farmer may only anchor their own telemetry."}
                )
            read_telemetry_values(telemetry, request_user=farmer)
            data_integrity_hash = telemetry.payload_sha256
        else:
            canonical_batch = json.dumps(
                {
                    "crop_type": serializer.validated_data["crop_type"],
                    "farmer_id": str(farmer.id),
                    "weight_grams": int(serializer.validated_data["weight_kg"] * 1000),
                },
                sort_keys=True,
                separators=(",", ":"),
            ).encode("utf-8")
            data_integrity_hash = hashlib.sha256(canonical_batch).hexdigest()

        batch = serializer.save(
            farmer=farmer,
            current_custodian=farmer,
            data_integrity_hash=data_integrity_hash,
        )

        AuditEvent.objects.create(
            event_type=AuditEvent.EventType.BATCH_PREPARE,
            user=farmer,
            description=f"Farmer {farmer.email} prepared batch {batch.id} in PENDING state",
            metadata={"batch_id": str(batch.id), "crop_type": batch.crop_type, "weight_kg": float(batch.weight_kg)}
        )

class BatchConfirmView(APIView):
    """Confirm a mint only after deriving and verifying its object from Sui effects."""
    permission_classes = (IsFarmer,)

    def post(self, request, pk):
        batch = get_object_or_404(ProduceBatch.objects.select_related("farmer"), pk=pk)

        if batch.farmer != request.user or batch.current_custodian != request.user:
            return Response({"error": "Unauthorized to confirm this batch"}, status=status.HTTP_403_FORBIDDEN)

        if batch.status != ProduceBatch.Status.PENDING:
            return Response({"error": f"Invalid transition from status {batch.status} to MINTED"}, status=status.HTTP_400_BAD_REQUEST)

        serializer = BatchConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        sui_tx_digest = serializer.validated_data["sui_tx_digest"]

        if not request.user.sui_public_key:
            return Response(
                {"error": "Bind a verified Sui wallet before minting."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if (
            ProduceBatch.objects.filter(sui_tx_digest=sui_tx_digest).exists()
            or CustodyTransfer.objects.filter(tx_digest=sui_tx_digest).exists()
        ):
            return Response({"error": "This transaction digest has already been consumed"}, status=status.HTTP_400_BAD_REQUEST)

        rpc_res = verify_sui_transaction_on_rpc(
            tx_digest=sui_tx_digest,
            expected_sender=request.user.sui_public_key,
            expected_function="mint_batch",
            expected_batch=batch,
        )
        if not rpc_res.get("verified"):
            return _rpc_failure_response(rpc_res, "mint")

        try:
            with transaction.atomic():
                batch = ProduceBatch.objects.select_for_update().get(pk=pk)
                if batch.status != ProduceBatch.Status.PENDING:
                    return Response(
                        {"error": f"Invalid transition from status {batch.status} to MINTED"},
                        status=status.HTTP_409_CONFLICT,
                    )
                if (
                    ProduceBatch.objects.filter(sui_tx_digest=sui_tx_digest).exclude(pk=batch.pk).exists()
                    or CustodyTransfer.objects.filter(tx_digest=sui_tx_digest).exists()
                ):
                    return Response(
                        {"error": "This transaction digest has already been consumed"},
                        status=status.HTTP_409_CONFLICT,
                    )
                batch.sui_object_id = rpc_res["object_id"]
                batch.sui_tx_digest = sui_tx_digest
                batch.mint_verified_at = timezone.now()
                batch.mint_verification = rpc_res
                batch.status = ProduceBatch.Status.MINTED
                batch.save(
                    update_fields=[
                        "sui_object_id",
                        "sui_tx_digest",
                        "mint_verified_at",
                        "mint_verification",
                        "status",
                        "updated_at",
                    ]
                )
                AuditEvent.objects.create(
                    event_type=AuditEvent.EventType.BATCH_CONFIRM,
                    user=request.user,
                    wallet_address=request.user.sui_public_key,
                    description=f"Verified Sui mint for batch {batch.id}",
                    metadata={
                        "batch_id": str(batch.id),
                        "sui_object_id": batch.sui_object_id,
                        "sui_tx_digest": sui_tx_digest,
                    },
                )
        except IntegrityError:
            return Response(
                {"error": "The Sui transaction digest or object ID has already been consumed."},
                status=status.HTTP_409_CONFLICT,
            )

        return Response(BatchOutputSerializer(batch).data)

class BatchTransferView(APIView):
    """Step 3: Transfer batch custody with Sui Testnet verification."""
    permission_classes = (IsAuthenticated,)

    def post(self, request, pk):
        batch = get_object_or_404(
            ProduceBatch.objects.select_related("farmer", "current_custodian"),
            pk=pk,
        )
        current_user = request.user

        if batch.current_custodian != current_user:
            return Response({"error": "Only the current custodian can initiate a custody transfer"}, status=status.HTTP_403_FORBIDDEN)

        input_serializer = BatchTransferInputSerializer(data=request.data)
        input_serializer.is_valid(raise_exception=True)
        transfer_data = input_serializer.validated_data
        target_user = get_object_or_404(User, id=transfer_data["to_user_id"])

        if not target_user.is_active or target_user.role not in {
            User.Role.FARMER,
            User.Role.LOGISTICS,
        }:
            return Response(
                {"error": "Target user is not an active custody stakeholder."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if target_user == current_user:
            return Response(
                {"error": "Custody cannot be transferred to the current custodian."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not current_user.sui_public_key or not target_user.sui_public_key:
            return Response({"error": "Target user must have a bound wallet address for on-chain custody"}, status=status.HTTP_400_BAD_REQUEST)

        target_status = transfer_data["status"]
        allowed = ALLOWED_LIFECYCLE_TRANSITIONS.get(batch.status, [])
        if target_status not in allowed:
            return Response({"error": f"Invalid lifecycle transition from {batch.status} to {target_status}"}, status=status.HTTP_400_BAD_REQUEST)

        sui_tx_digest = transfer_data["sui_tx_digest"]
        if (
            ProduceBatch.objects.filter(sui_tx_digest=sui_tx_digest).exists()
            or CustodyTransfer.objects.filter(tx_digest=sui_tx_digest).exists()
        ):
            return Response(
                {"error": "This transaction digest has already been consumed"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not batch.sui_object_id:
            return Response(
                {"error": "Batch has no verified Sui object."},
                status=status.HTTP_409_CONFLICT,
            )

        rpc_res = verify_sui_transaction_on_rpc(
            tx_digest=sui_tx_digest,
            expected_sender=current_user.sui_public_key,
            expected_function="transfer_custody",
            expected_batch=batch,
            expected_object_id=batch.sui_object_id,
            expected_recipient=target_user.sui_public_key,
        )
        if not rpc_res.get("verified"):
            return _rpc_failure_response(rpc_res, "custody transfer")

        try:
            with transaction.atomic():
                batch = ProduceBatch.objects.select_for_update().get(pk=pk)
                if batch.current_custodian_id != current_user.id:
                    return Response(
                        {"error": "Custody changed while this transfer was being verified."},
                        status=status.HTTP_409_CONFLICT,
                    )
                if target_status not in ALLOWED_LIFECYCLE_TRANSITIONS.get(batch.status, []):
                    return Response(
                        {"error": f"Invalid lifecycle transition from {batch.status} to {target_status}"},
                        status=status.HTTP_409_CONFLICT,
                    )
                if (
                    ProduceBatch.objects.filter(sui_tx_digest=sui_tx_digest).exists()
                    or CustodyTransfer.objects.filter(tx_digest=sui_tx_digest).exists()
                ):
                    return Response(
                        {"error": "This transaction digest has already been consumed"},
                        status=status.HTTP_409_CONFLICT,
                    )
                CustodyTransfer.objects.create(
                    batch=batch,
                    from_user=current_user,
                    to_user=target_user,
                    from_wallet=current_user.sui_public_key,
                    to_wallet=target_user.sui_public_key,
                    tx_digest=sui_tx_digest,
                    verified_on_chain=True,
                    event_metadata={**transfer_data["metadata"], "verification": rpc_res},
                )
                batch.current_custodian = target_user
                batch.status = target_status
                batch.save(update_fields=["current_custodian", "status", "updated_at"])
                AuditEvent.objects.create(
                    event_type=AuditEvent.EventType.CUSTODY_TRANSFER,
                    user=current_user,
                    wallet_address=current_user.sui_public_key,
                    description=f"Verified custody transfer for batch {batch.id}",
                    metadata={
                        "batch_id": str(batch.id),
                        "from_user": str(current_user.id),
                        "to_user": str(target_user.id),
                        "sui_tx_digest": sui_tx_digest,
                    },
                )
        except IntegrityError:
            return Response(
                {"error": "The Sui transaction digest has already been consumed."},
                status=status.HTTP_409_CONFLICT,
            )

        return Response(BatchOutputSerializer(batch).data)

class BatchListView(generics.ListAPIView):
    """List batches based on user role and ownership/custody permissions."""
    permission_classes = (IsAuthenticated,)
    serializer_class = BatchOutputSerializer

    def get_queryset(self):
        user = self.request.user
        if user.role == "ADMIN":
            return ProduceBatch.objects.all()
        return ProduceBatch.objects.filter(Q(current_custodian=user) | Q(farmer=user)).distinct()

class BatchDetailView(generics.RetrieveAPIView):
    """Retrieve batch details restricted by ownership/custody/admin permissions."""
    permission_classes = (IsAuthenticated,)
    serializer_class = BatchOutputSerializer

    def get_queryset(self):
        user = self.request.user
        if user.role == "ADMIN":
            return ProduceBatch.objects.all()
        return ProduceBatch.objects.filter(Q(current_custodian=user) | Q(farmer=user)).distinct()


class BatchLookupView(APIView):
    permission_classes = (IsAuthenticated,)

    def get(self, request, identifier):
        visible = ProduceBatch.objects.all() if request.user.role == "ADMIN" else ProduceBatch.objects.filter(
            Q(current_custodian=request.user) | Q(farmer=request.user)
        )
        batch = visible.filter(sui_object_id__iexact=identifier).first()
        if batch is None:
            try:
                batch = visible.filter(pk=identifier).first()
            except (ValueError, TypeError):
                batch = None
        if batch is None:
            return Response({"error": "Visible batch not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(BatchOutputSerializer(batch).data)


class CustodyTransferHistoryView(generics.ListAPIView):
    permission_classes = (IsAuthenticated,)
    serializer_class = CustodyTransferSerializer
    pagination_class = None

    def get_queryset(self):
        user = self.request.user
        batches = ProduceBatch.objects.all() if user.role == "ADMIN" else ProduceBatch.objects.filter(
            Q(current_custodian=user) | Q(farmer=user)
        )
        batch = get_object_or_404(batches, pk=self.kwargs["pk"])
        return batch.transfers.select_related("from_user", "to_user").all()

class PublicBatchVerifyView(APIView):
    """
    Fail-Closed Public Verification Endpoint.
    Returns separate statuses for local integrity, batch hash match, Sui transaction verification, and overall verification.
    Never returns verified=true if any required check fails.
    """
    permission_classes = (AllowAny,)

    def get(self, request, identifier):
        batch = None
        try:
            batch = ProduceBatch.objects.filter(Q(id=identifier) | Q(sui_object_id=identifier)).first()
        except Exception:
            batch = ProduceBatch.objects.filter(sui_object_id=identifier).first()

        if not batch:
            return Response({
                "verified": False,
                "error": "Batch record not found",
                "local_integrity": False,
                "batch_hash_match": False,
                "sui_tx_verified": False,
                "overall_verification": False
            }, status=status.HTTP_404_NOT_FOUND)

        local_integrity = True
        if batch.origin_telemetry:
            try:
                read_telemetry_values(
                    batch.origin_telemetry,
                    enforce_authorization=False,
                )
                local_integrity = True
            except (ValueError, ImproperlyConfigured):
                local_integrity = False

        batch_hash_match = (batch.data_integrity_hash == batch.origin_telemetry.payload_sha256) if batch.origin_telemetry else True

        sui_tx_verified = False
        sui_details = {}
        if batch.sui_tx_digest and batch.sui_object_id and batch.status != ProduceBatch.Status.PENDING:
            rpc_res = verify_sui_transaction_on_rpc(
                tx_digest=batch.sui_tx_digest,
                expected_sender=batch.farmer.sui_public_key,
                expected_function="mint_batch",
                expected_batch=batch,
                expected_object_id=batch.sui_object_id,
                expected_recipient=batch.current_custodian.sui_public_key,
            )
            sui_tx_verified = rpc_res.get("verified", False)
            sui_details = rpc_res

        custody_chain_verified = all(
            transfer.verified_on_chain and transfer.tx_digest
            for transfer in batch.transfers.all()
        )
        overall_verification = (
            local_integrity
            and batch_hash_match
            and sui_tx_verified
            and custody_chain_verified
        )

        return Response({
            "verified": overall_verification,
            "batch_id": str(batch.id),
            "crop_type": batch.crop_type,
            "weight_kg": float(batch.weight_kg),
            "weight_grams": batch.weight_grams,
            "status": batch.status,
            "farmer": batch.farmer.full_name,
            "current_custodian": batch.current_custodian.full_name,
            "sui_object_id": batch.sui_object_id,
            "sui_tx_digest": batch.sui_tx_digest,
            "data_integrity_hash": batch.data_integrity_hash,
            "local_integrity": local_integrity,
            "batch_hash_match": batch_hash_match,
            "sui_tx_verified": sui_tx_verified,
            "custody_chain_verified": custody_chain_verified,
            "overall_verification": overall_verification,
            "created_at": batch.created_at,
            "sui_explorer_url": f"https://suiscan.xyz/testnet/object/{batch.sui_object_id}" if batch.sui_object_id else None
        })
