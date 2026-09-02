from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.shortcuts import get_object_or_404
from django.db.models import Q
from django.contrib.auth import get_user_model
from apps.users.permissions import IsFarmer, IsLogistics, IsFarmerOrAdmin
from apps.telemetry.services import generate_telemetry_hash
from apps.users.models import AuditEvent
from .models import ProduceBatch, CustodyTransfer
from .serializers import (
    BatchConfirmSerializer, BatchOutputSerializer, BatchPrepareSerializer,
    CustodyTransferSerializer
)
from .services import verify_integrity, verify_sui_transaction_on_rpc

User = get_user_model()

ALLOWED_LIFECYCLE_TRANSITIONS = {
    ProduceBatch.Status.PENDING: [ProduceBatch.Status.MINTED],
    ProduceBatch.Status.MINTED: [ProduceBatch.Status.IN_TRANSIT],
    ProduceBatch.Status.IN_TRANSIT: [ProduceBatch.Status.IN_TRANSIT, ProduceBatch.Status.DELIVERED],
    ProduceBatch.Status.DELIVERED: []
}

class BatchPrepareView(generics.CreateAPIView):
    """Step 1: Farmer stages a produce batch record in PENDING state before calling Sui Move contract."""
    permission_classes = (IsFarmer,)
    serializer_class = BatchPrepareSerializer

    def perform_create(self, serializer):
        farmer = self.request.user
        telemetry = serializer.validated_data.get('origin_telemetry')
        if telemetry:
            data_integrity_hash = generate_telemetry_hash(
                farmer_id=farmer.id,
                recorded_at=telemetry.recorded_at,
                temperature=telemetry.temperature_celsius,
                soil_moisture=telemetry.soil_moisture_percentage,
                soil_ph=telemetry.soil_ph,
            )
        else:
            data_integrity_hash = "no-telemetry-hash"

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
    """Step 2: Farmer confirms the Sui object ID and tx digest after on-chain minting with RPC verification."""
    permission_classes = (IsFarmer,)

    def post(self, request, pk):
        batch = get_object_or_404(ProduceBatch, pk=pk)

        if batch.farmer != request.user or batch.current_custodian != request.user:
            return Response({"error": "Unauthorized to confirm this batch"}, status=status.HTTP_403_FORBIDDEN)

        if batch.status != ProduceBatch.Status.PENDING:
            return Response({"error": f"Invalid transition from status {batch.status} to MINTED"}, status=status.HTTP_400_BAD_REQUEST)

        serializer = BatchConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        sui_object_id = serializer.validated_data['sui_object_id']
        sui_tx_digest = serializer.validated_data.get('sui_tx_digest')

        if sui_tx_digest and ProduceBatch.objects.filter(sui_tx_digest=sui_tx_digest).exclude(id=batch.id).exists():
            return Response({"error": "This transaction digest has already been consumed"}, status=status.HTTP_400_BAD_REQUEST)

        if sui_tx_digest:
            rpc_res = verify_sui_transaction_on_rpc(
                tx_digest=sui_tx_digest,
                expected_sender=request.user.sui_public_key,
                expected_function="mint_batch"
            )
            if not rpc_res["verified"] and "Failed to connect" not in rpc_res.get("error", ""):
                return Response({"error": f"Sui Testnet Verification Failed: {rpc_res.get('error')}"}, status=status.HTTP_400_BAD_REQUEST)

            if rpc_res.get("object_id"):
                sui_object_id = rpc_res["object_id"]

        batch.sui_object_id = sui_object_id
        if sui_tx_digest:
            batch.sui_tx_digest = sui_tx_digest
        batch.status = ProduceBatch.Status.MINTED
        batch.save()

        AuditEvent.objects.create(
            event_type=AuditEvent.EventType.BATCH_CONFIRM,
            user=request.user,
            description=f"Farmer {request.user.email} confirmed mint for batch {batch.id} (Object ID: {sui_object_id})",
            metadata={"batch_id": str(batch.id), "sui_object_id": sui_object_id, "sui_tx_digest": sui_tx_digest}
        )

        return Response(BatchOutputSerializer(batch).data)

class BatchTransferView(APIView):
    """Step 3: Transfer batch custody with Sui Testnet verification."""
    permission_classes = (IsAuthenticated,)

    def post(self, request, pk):
        batch = get_object_or_404(ProduceBatch, pk=pk)
        current_user = request.user

        target_user_id = request.data.get("to_user_id")
        target_wallet = request.data.get("to_wallet")

        if batch.current_custodian == current_user:
            # Current custodian transferring to new target
            target_user = None
            if target_user_id:
                target_user = get_object_or_404(User, id=target_user_id)
            elif target_wallet:
                target_user = User.objects.filter(sui_public_key__iexact=target_wallet).first()
                if not target_user:
                    return Response({"error": "Target wallet address is not registered to an authorized user"}, status=status.HTTP_400_BAD_REQUEST)
            else:
                return Response({"error": "to_user_id or to_wallet is required"}, status=status.HTTP_400_BAD_REQUEST)
        elif current_user.role == User.Role.LOGISTICS and batch.current_custodian == batch.farmer:
            # Logistics picking up from farmer
            target_user = current_user
        else:
            return Response({"error": "Only the current custodian or authorized carrier can initiate a custody transfer"}, status=status.HTTP_403_FORBIDDEN)

        if target_user_id and not target_user.sui_public_key:
            return Response({"error": "Target user must have a bound wallet address for on-chain custody"}, status=status.HTTP_400_BAD_REQUEST)

        target_status = request.data.get("status", ProduceBatch.Status.IN_TRANSIT)
        allowed = ALLOWED_LIFECYCLE_TRANSITIONS.get(batch.status, [])
        if target_status not in allowed:
            return Response({"error": f"Invalid lifecycle transition from {batch.status} to {target_status}"}, status=status.HTTP_400_BAD_REQUEST)

        sui_tx_digest = request.data.get("sui_tx_digest", "")

        verified_on_chain = False
        if sui_tx_digest:
            rpc_res = verify_sui_transaction_on_rpc(
                tx_digest=sui_tx_digest,
                expected_sender=current_user.sui_public_key,
                expected_function="transfer_custody"
            )
            if rpc_res["verified"]:
                verified_on_chain = True
            elif "Failed to connect" not in rpc_res.get("error", ""):
                return Response({"error": f"Sui Testnet Transfer Verification Failed: {rpc_res.get('error')}"}, status=status.HTTP_400_BAD_REQUEST)

        transfer_record = CustodyTransfer.objects.create(
            batch=batch,
            from_user=current_user,
            to_user=target_user,
            from_wallet=current_user.sui_public_key or "",
            to_wallet=target_user.sui_public_key or "",
            tx_digest=sui_tx_digest,
            verified_on_chain=verified_on_chain,
            event_metadata=request.data.get("metadata", {})
        )

        batch.current_custodian = target_user
        batch.status = target_status
        if sui_tx_digest:
            batch.sui_tx_digest = sui_tx_digest
        batch.save()

        AuditEvent.objects.create(
            event_type=AuditEvent.EventType.CUSTODY_TRANSFER,
            user=current_user,
            description=f"Custody of batch {batch.id} transferred from {current_user.email} to {target_user.email}",
            metadata={"batch_id": str(batch.id), "from_user": str(current_user.id), "to_user": str(target_user.id), "sui_tx_digest": sui_tx_digest}
        )

        return Response(BatchOutputSerializer(batch).data)

class BatchListView(generics.ListAPIView):
    """List batches based on user role and ownership/custody permissions."""
    permission_classes = (IsFarmerOrAdmin,)
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


class BatchTransferHistoryView(generics.ListAPIView):
    permission_classes = (IsAuthenticated,)
    serializer_class = CustodyTransferSerializer

    def get_queryset(self):
        batch = get_object_or_404(ProduceBatch, pk=self.kwargs['pk'])
        user = self.request.user
        if user.role != 'ADMIN' and user not in (batch.farmer, batch.current_custodian):
            return CustodyTransfer.objects.none()
        return batch.transfers.select_related('from_user', 'to_user').all()

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
            recomputed = generate_telemetry_hash(
                farmer_id=batch.origin_telemetry.farmer_id,
                recorded_at=batch.origin_telemetry.recorded_at,
                temperature=batch.origin_telemetry.temperature_celsius,
                soil_moisture=batch.origin_telemetry.soil_moisture_percentage,
                soil_ph=batch.origin_telemetry.soil_ph
            )
            local_integrity = (recomputed == batch.origin_telemetry.payload_sha256)

        batch_hash_match = (batch.data_integrity_hash == batch.origin_telemetry.payload_sha256) if batch.origin_telemetry else True

        sui_tx_verified = False
        sui_details = {}
        if batch.sui_tx_digest:
            rpc_res = verify_sui_transaction_on_rpc(tx_digest=batch.sui_tx_digest)
            sui_tx_verified = rpc_res.get("verified", False)
            sui_details = rpc_res

        overall_verification = local_integrity and batch_hash_match and (sui_tx_verified if batch.sui_tx_digest else True)

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
            "overall_verification": overall_verification,
            "created_at": batch.created_at,
            "sui_explorer_url": f"https://suiscan.xyz/testnet/object/{batch.sui_object_id}" if batch.sui_object_id else None
        })
