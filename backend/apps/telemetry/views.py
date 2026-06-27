from rest_framework import generics, status
from rest_framework.response import Response
from django.db import transaction, IntegrityError
from django.utils import timezone
# pyrefly: ignore [missing-import]
from apps.users.permissions import IsFarmer, IsFarmerOrAdmin
from .models import EnvironmentalTelemetry
from .serializers import TelemetryInputSerializer, TelemetryOutputSerializer
from .services import generate_telemetry_hash


class TelemetrySubmitView(generics.CreateAPIView):
    permission_classes = (IsFarmer,)
    serializer_class = TelemetryInputSerializer

    @transaction.atomic
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


class TelemetryLatestView(generics.RetrieveAPIView):
    permission_classes = (IsFarmerOrAdmin,)
    serializer_class = TelemetryOutputSerializer

    def get_object(self):
        user = self.request.user
        if user.role == "ADMIN":
            return EnvironmentalTelemetry.objects.latest('recorded_at')
        return EnvironmentalTelemetry.objects.filter(farmer=user).latest('recorded_at')