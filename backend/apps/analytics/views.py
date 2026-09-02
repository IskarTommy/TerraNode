from rest_framework.views import APIView
from rest_framework.response import Response
from apps.users.permissions import IsFarmer
from apps.users.permissions import IsAdmin
from apps.users.models import AuditEvent
from apps.ledger.models import ProduceBatch
from apps.telemetry.models import EnvironmentalTelemetry
from django.contrib.auth import get_user_model
from django.core.cache import cache
from .services import predict_yield

from rest_framework.permissions import IsAuthenticated

class PredictYieldView(APIView):
    permission_classes = (IsAuthenticated,)

    def get(self, request):
        result = predict_yield(request.user.id)
        if "error" in result:
            return Response(result, status=400)
        return Response(result)

class SummaryView(APIView):
    permission_classes = (IsFarmer,)

    def get(self, request):
        return Response({
            "message": "Analytics engine operational",
            "status": "OPERATIONAL",
            "cache_backend": "Active",
            "model_version": "thesis-v1"
        })


class AdminStatsView(APIView):
    permission_classes = (IsAdmin,)

    def get(self, request):
        User = get_user_model()
        return Response({
            "total_users": User.objects.count(),
            "total_farmers": User.objects.filter(role='FARMER').count(),
            "total_logistics": User.objects.filter(role='LOGISTICS').count(),
            "total_admins": User.objects.filter(role='ADMIN').count(),
            "total_batches": ProduceBatch.objects.count(),
            "pending_batches": ProduceBatch.objects.filter(status='PENDING').count(),
            "minted_batches": ProduceBatch.objects.filter(status='MINTED').count(),
            "in_transit_batches": ProduceBatch.objects.filter(status='IN_TRANSIT').count(),
            "delivered_batches": ProduceBatch.objects.filter(status='DELIVERED').count(),
            "telemetry_records": EnvironmentalTelemetry.objects.count(),
            "flagged_anomalies": AuditEvent.objects.filter(event_type='INTEGRITY_CHECK_FAIL').count(),
        })


class SystemHealthView(APIView):
    permission_classes = (IsAdmin,)

    def get(self, request):
        database_status = 'healthy'
        cache_status = 'healthy'
        try:
            get_user_model().objects.exists()
        except Exception:
            database_status = 'down'
        try:
            cache.set('terranode:health', 'ok', 5)
            if cache.get('terranode:health') != 'ok':
                cache_status = 'degraded'
        except Exception:
            cache_status = 'down'
        return Response({
            "database": database_status,
            "redis": cache_status,
            "blockchain": "configured" if request.user.sui_public_key else "not_configured",
            "api": "healthy",
        })
