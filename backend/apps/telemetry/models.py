from django.db import models
from django.conf import settings
import uuid

class EnvironmentalTelemetry(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    farmer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="telemetry")
    recorded_at = models.DateTimeField()
    temperature_celsius = models.FloatField()
    soil_moisture_percentage = models.FloatField()
    soil_ph = models.FloatField()
    payload_sha256 = models.CharField(max_length=64, unique=True, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-recorded_at']
        indexes = [
            models.Index(fields=['farmer', 'recorded_at']),
        ]

    def __str__(self):
        return f"Telemetry {self.id} for {self.farmer}"