from django.urls import path
from .views import (
    AdminStatsView,
    AuditEventListView,
    PredictYieldView,
    SummaryView,
    SystemHealthView,
)

urlpatterns = [
    path('predict/', PredictYieldView.as_view(), name='analytics_predict'),
    path('summary/', SummaryView.as_view(), name='analytics_summary'),
    path('admin-stats/', AdminStatsView.as_view(), name='analytics_admin_stats'),
    path('health/', SystemHealthView.as_view(), name='analytics_health'),
    path('audit-logs/', AuditEventListView.as_view(), name='analytics_audit_logs'),
]
