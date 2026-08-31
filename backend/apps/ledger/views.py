from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.shortcuts import get_object_or_404
from django.db.models import Q
from apps.users.permissions import IsFarmer, IsLogistics, IsFarmerOrAdmin
from apps.telemetry.services import generate_telemetry_hash
from .models import ProduceBatch
from .serializers import BatchPrepareSerializer, BatchConfirmSerializer, BatchOutputSerializer

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
        serializer.save(
            farmer=farmer,
            current_custodian=farmer,
            data_integrity_hash=data_integrity_hash,
        )

class BatchConfirmView(APIView):
    """Step 2: Farmer confirms the Sui object ID and tx digest after on-chain minting."""
    permission_classes = (IsFarmer,)

    def post(self, request, pk):
        batch = get_object_or_404(ProduceBatch, pk=pk)

        # Only the creator/custodian farmer can confirm minting
        if batch.farmer != request.user and batch.current_custodian != request.user:
            return Response({"error": "Unauthorized to confirm this batch"}, status=status.HTTP_403_FORBIDDEN)

        serializer = BatchConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        batch.sui_object_id = serializer.validated_data['sui_object_id']
        sui_tx_digest = serializer.validated_data.get('sui_tx_digest')
        if sui_tx_digest:
            batch.sui_tx_digest = sui_tx_digest
        batch.status = ProduceBatch.Status.MINTED
        batch.save()
        return Response(BatchOutputSerializer(batch).data)

class BatchTransferView(APIView):
    """Step 3: Update custodian after physical / on-chain custody handover."""
    permission_classes = (IsAuthenticated,)

    def post(self, request, pk):
        batch = get_object_or_404(ProduceBatch, pk=pk)
        
        # New custodian can be passed in request body, or defaults to the authenticated requester
        new_status = request.data.get("status", ProduceBatch.Status.IN_TRANSIT)
        if new_status in ProduceBatch.Status.values:
            batch.status = new_status
        else:
            batch.status = ProduceBatch.Status.IN_TRANSIT

        batch.current_custodian = request.user
        sui_tx_digest = request.data.get("sui_tx_digest")
        if sui_tx_digest:
            batch.sui_tx_digest = sui_tx_digest

        batch.save()
        return Response(BatchOutputSerializer(batch).data)

class BatchListView(generics.ListAPIView):
    """List batches based on user role."""
    permission_classes = (IsAuthenticated,)
    serializer_class = BatchOutputSerializer

    def get_queryset(self):
        user = self.request.user
        if user.role == "ADMIN":
            return ProduceBatch.objects.all()
        # Farmers and logistics handlers see batches where they are the creator or custodian
        return ProduceBatch.objects.filter(Q(current_custodian=user) | Q(farmer=user)).distinct()

class BatchDetailView(generics.RetrieveAPIView):
    """Retrieve full batch details."""
    permission_classes = (IsAuthenticated,)
    queryset = ProduceBatch.objects.all()
    serializer_class = BatchOutputSerializer

class PublicBatchVerifyView(APIView):
    """Public endpoint for QR code / consumer verification without authentication."""
    permission_classes = (AllowAny,)

    def get(self, request, identifier):
        # Lookup by UUID pk or sui_object_id
        batch = None
        try:
            batch = ProduceBatch.objects.filter(Q(id=identifier) | Q(sui_object_id=identifier)).first()
        except Exception:
            batch = ProduceBatch.objects.filter(sui_object_id=identifier).first()

        if not batch:
            return Response({"error": "Batch record not found"}, status=status.HTTP_404_NOT_FOUND)

        # Re-verify telemetry integrity hash
        is_hash_valid = True
        if batch.origin_telemetry:
            recomputed = generate_telemetry_hash(
                farmer_id=batch.origin_telemetry.farmer_id,
                recorded_at=batch.origin_telemetry.recorded_at,
                temperature=batch.origin_telemetry.temperature_celsius,
                soil_moisture=batch.origin_telemetry.soil_moisture_percentage,
                soil_ph=batch.origin_telemetry.soil_ph
            )
            is_hash_valid = (recomputed == batch.origin_telemetry.payload_sha256)

        return Response({
            "verified": True,
            "batch_id": str(batch.id),
            "crop_type": batch.crop_type,
            "weight_kg": float(batch.weight_kg),
            "status": batch.status,
            "farmer": batch.farmer.full_name,
            "current_custodian": batch.current_custodian.full_name,
            "sui_object_id": batch.sui_object_id,
            "sui_tx_digest": batch.sui_tx_digest,
            "data_integrity_hash": batch.data_integrity_hash,
            "hash_verification": "VALID" if is_hash_valid else "TAMPER_DETECTED",
            "created_at": batch.created_at,
            "sui_explorer_url": f"https://suiscan.xyz/testnet/object/{batch.sui_object_id}" if batch.sui_object_id else None
        })
