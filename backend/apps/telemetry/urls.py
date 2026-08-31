from django.urls import path
from .views import (
    TelemetrySubmitView,
    TelemetryHistoryView,
    TelemetryLatestView,
    TelemetryAuditLogView
)

urlpatterns = [
    path('submit/', TelemetrySubmitView.as_view(), name='telemetry_submit'),
    path('history/', TelemetryHistoryView.as_view(), name='telemetry_history'),
    path('latest/', TelemetryLatestView.as_view(), name='telemetry_latest'),
    path('audit/', TelemetryAuditLogView.as_view(), name='telemetry_audit'),
]
