from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from apps.users.permissions import IsFarmer, IsLogistics, IsFarmerOrAdmin
from apps.telemetry.services import generate_telemetry_hash
from .models import ProduceBatch
from .serializers import BatchPrepareSerializer, BatchConfirmSerializer, BatchOutputSerializer

class BatchPrepareView(generics.CreateAPIView):
    """Step 1: Farmer creates the backend record in PENDING state before calling Sui contract."""
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
    """Step 2: Farmer confirms the Sui object ID after successful on-chain minting."""
    permission_classes = (IsFarmer,)

    def post(self, request, pk):
        batch = get_object_or_404(ProduceBatch, pk=pk)

        # Only the current custodian can confirm minting
        if batch.current_custodian != request.user:
            return Response(status=status.HTTP_403_FORBIDDEN)

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
    """Step 3: Update local custodian after on-chain transfer."""
    permission_classes = (IsLogistics,) # In reality, either farmer or logistics could transfer

    def post(self, request, pk):
        batch = get_object_or_404(ProduceBatch, pk=pk)
        # Verify the user making the request is the current custodian or authorized
        batch.current_custodian = request.user
        batch.status = ProduceBatch.Status.IN_TRANSIT
        batch.save()
        return Response(BatchOutputSerializer(batch).data)

class BatchListView(generics.ListAPIView):
    permission_classes = (IsFarmerOrAdmin,)
    serializer_class = BatchOutputSerializer

    def get_queryset(self):
        user = self.request.user
        if user.role == "ADMIN":
            return ProduceBatch.objects.all()
        return ProduceBatch.objects.filter(current_custodian=user)
