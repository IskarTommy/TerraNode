from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .services import predict_yield, CROP_PROFILES
from django.conf import settings
from django.core.cache import cache
from django.db import connection
from django.db.models import Count
from apps.users.permissions import IsAdmin
from apps.users.models import AuditEvent, CustomUser
from apps.ledger.models import ProduceBatch
from apps.telemetry.models import EnvironmentalTelemetry
from rest_framework import generics, serializers

class PredictYieldView(APIView):
    permission_classes = (IsAuthenticated,)

    def get(self, request):
        crop_type = request.query_params.get("crop_type", "MAIZE")

        simulated = None
        if "sim_temp" in request.query_params or "sim_moisture" in request.query_params or "sim_ph" in request.query_params:
            if not getattr(settings, "ALLOW_ANALYTICS_SIMULATION", False):
                return Response(
                    {"error": "Simulation mode is disabled."},
                    status=400,
                )
            simulated = {
                "temp": request.query_params.get("sim_temp"),
                "moisture": request.query_params.get("sim_moisture"),
                "ph": request.query_params.get("sim_ph")
            }

        result = predict_yield(request.user.id, crop_type=crop_type, simulated_params=simulated)
        if "error" in result:
            return Response(result, status=400)
        return Response(result)

class SummaryView(APIView):
    permission_classes = (IsAuthenticated,)

    def get(self, request):
        return Response({
            "message": "Analytics engine operational",
            "status": "OPERATIONAL",
            "available_crop_profiles": list(CROP_PROFILES.keys()),
            "cache_backend": "Active",
            "model_version": "v2.1-WeightedMovingAverage"
        })


class AuditEventSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source="user.email", read_only=True)

    class Meta:
        model = AuditEvent
        fields = (
            "id",
            "event_type",
            "user_email",
            "wallet_address",
            "ip_address",
            "timestamp",
            "description",
            "metadata",
        )


class AuditEventListView(generics.ListAPIView):
    permission_classes = (IsAdmin,)
    serializer_class = AuditEventSerializer
    queryset = AuditEvent.objects.select_related("user").all()


class AdminStatsView(APIView):
    permission_classes = (IsAdmin,)

    def get(self, request):
        status_counts = {
            item["status"]: item["count"]
            for item in ProduceBatch.objects.values("status").annotate(
                count=Count("id")
            )
        }
        return Response(
            {
                "total_users": CustomUser.objects.count(),
                "total_farmers": CustomUser.objects.filter(role=CustomUser.Role.FARMER).count(),
                "total_logistics": CustomUser.objects.filter(role=CustomUser.Role.LOGISTICS).count(),
                "total_admins": CustomUser.objects.filter(role=CustomUser.Role.ADMIN).count(),
                "total_batches": ProduceBatch.objects.count(),
                "pending_batches": status_counts.get(ProduceBatch.Status.PENDING, 0),
                "minted_batches": status_counts.get(ProduceBatch.Status.MINTED, 0),
                "in_transit_batches": status_counts.get(ProduceBatch.Status.IN_TRANSIT, 0),
                "delivered_batches": status_counts.get(ProduceBatch.Status.DELIVERED, 0),
                "telemetry_records": EnvironmentalTelemetry.objects.count(),
                "flagged_anomalies": AuditEvent.objects.filter(
                    event_type__in=[
                        AuditEvent.EventType.SECURITY_ALERT,
                        AuditEvent.EventType.INTEGRITY_CHECK_FAIL,
                    ]
                ).count(),
            }
        )


class SystemHealthView(APIView):
    permission_classes = (IsAdmin,)

    def get(self, request):
        health = {
            "database": "down",
            "redis": "degraded",
            "celery_workers": "degraded",
            "blockchain": "degraded",
        }
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
                cursor.fetchone()
            health["database"] = "healthy"
        except Exception:
            pass
        try:
            cache_backend = settings.CACHES["default"].get("BACKEND", "")
            if "redis" in cache_backend.lower():
                cache.set("healthcheck", "ok", 5)
                if cache.get("healthcheck") == "ok":
                    health["redis"] = "healthy"
        except Exception:
            pass
        return Response(health)
