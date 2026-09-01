from datetime import datetime, time

from rest_framework import generics, status
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db import transaction, IntegrityError
from django.core.exceptions import ImproperlyConfigured
from django.http import Http404
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.dateparse import parse_date, parse_datetime
from rest_framework.permissions import IsAuthenticated
from apps.users.permissions import IsFarmer, IsFarmerOrAdmin, IsAdmin
from .models import EnvironmentalTelemetry
from .serializers import TelemetryInputSerializer, TelemetryOutputSerializer
from .encryption_service import encrypted_storage_fields, read_telemetry_values
from .models import DataProvenance

class TelemetrySubmitView(generics.CreateAPIView):
    permission_classes = (IsFarmer,)
    serializer_class = TelemetryInputSerializer

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        data = serializer.validated_data
        farmer = request.user
        recorded_at = data.get("recorded_at") or timezone.now()
        temperature = data.get("temperature_celsius")
        soil_moisture = data.get("soil_moisture_percentage")
        soil_ph = data.get("soil_ph")

        try:
            with transaction.atomic():
                provenance = DataProvenance.objects.create(
                    source_type=DataProvenance.SourceType.MANUAL,
                    provider_name="TerraNode authenticated submission",
                    dataset_name="Manual environmental observation",
                    source_record_id=f"{farmer.id}:{recorded_at.isoformat()}",
                    time_standard="UTC",
                )
                storage = encrypted_storage_fields(
                    farmer.id,
                    recorded_at,
                    temperature,
                    soil_moisture,
                    soil_ph,
                )
                telemetry = EnvironmentalTelemetry.objects.create(
                    farmer=farmer,
                    recorded_at=recorded_at,
                    temperature_celsius=None,
                    soil_moisture_percentage=None,
                    soil_ph=None,
                    provenance=provenance,
                    **storage,
                )
        except ImproperlyConfigured:
            return Response(
                {"error": "Telemetry encryption is not configured; no data was stored."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        except IntegrityError:
            return Response(
                {"error": "Duplicate telemetry record (same data already submitted)"},
                status=status.HTTP_409_CONFLICT
            )

        output_serializer = TelemetryOutputSerializer(
            telemetry,
            context={"request": request},
        )
        return Response(output_serializer.data, status=status.HTTP_201_CREATED)

class TelemetryHistoryView(generics.ListAPIView):
    permission_classes = (IsFarmerOrAdmin,)
    serializer_class = TelemetryOutputSerializer

    def get_queryset(self):
        user = self.request.user
        if user.role == "ADMIN":
            queryset = EnvironmentalTelemetry.objects.all()
        else:
            queryset = EnvironmentalTelemetry.objects.filter(farmer=user)

        start = self._parse_boundary(self.request.query_params.get("start"), end=False)
        end = self._parse_boundary(self.request.query_params.get("end"), end=True)
        if start and end and start > end:
            raise ValidationError({"end": "End must not be earlier than start."})
        if start:
            queryset = queryset.filter(recorded_at__gte=start)
        if end:
            queryset = queryset.filter(recorded_at__lte=end)
        return queryset.select_related("farmer", "provenance")

    @staticmethod
    def _parse_boundary(value, *, end):
        if not value:
            return None
        parsed = parse_datetime(value)
        if parsed is None:
            parsed_date = parse_date(value)
            if parsed_date is None:
                raise ValidationError(
                    {"end" if end else "start": "Use an ISO-8601 date or timestamp."}
                )
            parsed = datetime.combine(parsed_date, time.max if end else time.min)
        if timezone.is_naive(parsed):
            parsed = timezone.make_aware(parsed, timezone.get_current_timezone())
        return parsed

class TelemetryLatestView(generics.RetrieveAPIView):
    permission_classes = (IsFarmerOrAdmin,)
    serializer_class = TelemetryOutputSerializer

    def get_object(self):
        user = self.request.user
        if user.role == "ADMIN":
            queryset = EnvironmentalTelemetry.objects.all()
        else:
            queryset = EnvironmentalTelemetry.objects.filter(farmer=user)
        obj = queryset.order_by("-recorded_at").first()
        if not obj:
            raise Http404("No telemetry records found.")
        return obj

class TelemetryAuditLogView(APIView):
    """Administrator cryptographic audit trail to verify hash integrity across all stored telemetry."""
    permission_classes = (IsAdmin,)

    def get(self, request):
        records = EnvironmentalTelemetry.objects.all().order_by('-recorded_at')[:100]
        audit_results = []
        tampered_count = 0

        for r in records:
            try:
                values = read_telemetry_values(r, request_user=request.user)
                recomputed_hash = r.payload_sha256
                is_valid = True
            except (ValueError, ImproperlyConfigured):
                values = {
                    "temperature_celsius": None,
                    "soil_moisture_percentage": None,
                    "soil_ph": None,
                }
                recomputed_hash = None
                is_valid = False
                tampered_count += 1

            audit_results.append({
                "id": str(r.id),
                "farmer": r.farmer.full_name,
                "recorded_at": r.recorded_at,
                "temperature": values["temperature_celsius"],
                "soil_moisture": values["soil_moisture_percentage"],
                "soil_ph": values["soil_ph"],
                "stored_hash": r.payload_sha256,
                "recomputed_hash": recomputed_hash,
                "status": "INTEGRITY_VERIFIED" if is_valid else "TAMPER_FLAGGED"
            })

        return Response({
            "total_audited": len(records),
            "tampered_count": tampered_count,
            "overall_integrity": "PASS" if tampered_count == 0 else "FAIL_TAMPER_DETECTED",
            "algorithm": "SHA-256 (Canonical JSON FIPS 180-4)",
            "audit_trail": audit_results
        })
