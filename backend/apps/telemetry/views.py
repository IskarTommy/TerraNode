from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db import transaction, IntegrityError
from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from apps.users.permissions import IsFarmer, IsFarmerOrAdmin, IsAdmin
from .models import EnvironmentalTelemetry
from .serializers import TelemetryInputSerializer, TelemetryOutputSerializer
from .services import generate_telemetry_hash

class TelemetrySubmitView(generics.CreateAPIView):
    permission_classes = (IsFarmer,)
    serializer_class = TelemetryInputSerializer

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        data = serializer.validated_data
        farmer = request.user
        recorded_at = timezone.now()

        payload_hash = generate_telemetry_hash(
            farmer_id=farmer.id,
            recorded_at=recorded_at,
            temperature=data['temperature_celsius'],
            soil_moisture=data['soil_moisture_percentage'],
            soil_ph=data['soil_ph']
        )

        try:
            with transaction.atomic():
                telemetry = EnvironmentalTelemetry.objects.create(
                    farmer=farmer,
                    recorded_at=recorded_at,
                    temperature_celsius=data['temperature_celsius'],
                    soil_moisture_percentage=data['soil_moisture_percentage'],
                    soil_ph=data['soil_ph'],
                    payload_sha256=payload_hash
                )
        except IntegrityError:
            return Response(
                {"error": "Duplicate telemetry record (same data already submitted)"},
                status=status.HTTP_409_CONFLICT
            )

        output_serializer = TelemetryOutputSerializer(telemetry)
        return Response(output_serializer.data, status=status.HTTP_201_CREATED)

class TelemetryHistoryView(generics.ListAPIView):
    permission_classes = (IsFarmerOrAdmin,)
    serializer_class = TelemetryOutputSerializer

    def get_queryset(self):
        user = self.request.user
        if user.role == "ADMIN":
            return EnvironmentalTelemetry.objects.all()
        return EnvironmentalTelemetry.objects.filter(farmer=user)

from django.http import Http404

class TelemetryLatestView(generics.RetrieveAPIView):
    permission_classes = (IsFarmerOrAdmin,)
    serializer_class = TelemetryOutputSerializer

    def get_object(self):
        user = self.request.user
        qs = EnvironmentalTelemetry.objects.all() if user.role == "ADMIN" else EnvironmentalTelemetry.objects.filter(farmer=user)
        try:
            return qs.latest('recorded_at')
        except EnvironmentalTelemetry.DoesNotExist:
            raise Http404("No telemetry records found for this user.")

class TelemetryAuditLogView(APIView):
    """Administrator cryptographic audit trail to verify hash integrity across all stored telemetry."""
    permission_classes = (IsAdmin,)

    def get(self, request):
        records = EnvironmentalTelemetry.objects.all().order_by('-recorded_at')[:100]
        audit_results = []
        tampered_count = 0

        for r in records:
            expected_hash = generate_telemetry_hash(
                farmer_id=r.farmer_id,
                recorded_at=r.recorded_at,
                temperature=r.temperature_celsius,
                soil_moisture=r.soil_moisture_percentage,
                soil_ph=r.soil_ph
            )
            is_valid = (expected_hash == r.payload_sha256)
            if not is_valid:
                tampered_count += 1

            audit_results.append({
                "id": str(r.id),
                "farmer": r.farmer.full_name,
                "recorded_at": r.recorded_at,
                "temperature": r.temperature_celsius,
                "soil_moisture": r.soil_moisture_percentage,
                "soil_ph": r.soil_ph,
                "stored_hash": r.payload_sha256,
                "recomputed_hash": expected_hash,
                "status": "INTEGRITY_VERIFIED" if is_valid else "TAMPER_FLAGGED"
            })

        return Response({
            "total_audited": len(records),
            "tampered_count": tampered_count,
            "overall_integrity": "PASS" if tampered_count == 0 else "FAIL_TAMPER_DETECTED",
            "algorithm": "SHA-256 (Canonical JSON FIPS 180-4)",
            "audit_trail": audit_results
        })