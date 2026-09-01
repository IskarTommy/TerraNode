from django.contrib import admin
from django.urls import path, include
from core.views import healthz

urlpatterns = [
    path("healthz/", healthz, name="healthz"),
    path("admin/", admin.site.urls),
    path("api/v1/auth/", include("apps.users.urls")),
    path("api/v1/telemetry/", include("apps.telemetry.urls")),
    path("api/v1/ledger/", include("apps.ledger.urls")),
    path("api/v1/analytics/", include("apps.analytics.urls")),
]
