from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from apps.users.permissions import IsFarmer, IsLogistics, IsFarmerOrAdmin
from .models import ProduceBatch
from .serializers import BatchPrepareSerializer, BatchConfirmSerializer, BatchOutputSerializer

class BatchPrepareView(generics.CreateAPIView):
    """Step 1: Farmer creates the backend record in PENDING state before calling Sui contract."""
    permission_classes = (IsFarmer,)
    serializer_class = BatchPrepareSerializer

    def perform_create(self, serializer):
        serializer.save(current_custodian=self.request.user)

class BatchConfirmView(APIView):
    """Step 2: Farmer confirms the Sui object ID after successful on-chain minting."""
    permission_classes = (IsFarmer,)

    def post(self, request, pk):
        batch = get_object_or_404(ProduceBatch, pk=pk)
        
        # Only the current custodian can confirm minting
        if batch.current_custodian != request.user:
            return Response(status=status.HTTP_403_FORBIDDEN)
            
        serializer = BatchConfirmSerializer(data=request.data)
        if serializer.is_valid():
            batch.sui_object_id = serializer.validated_data['sui_object_id']
            batch.status = ProduceBatch.Status.MINTED
            batch.save()
            return Response(BatchOutputSerializer(batch).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

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
