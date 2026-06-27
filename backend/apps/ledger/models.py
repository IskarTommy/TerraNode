from django.db import models
from django.conf import settings
import uuid

class ProduceBatch(models.Model):
    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending Chain Confirmation"
        MINTED = "MINTED", "Minted on Sui"
        IN_TRANSIT = "IN_TRANSIT", "In Transit"
        DELIVERED = "DELIVERED", "Delivered"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    origin_telemetry = models.OneToOneField("telemetry.EnvironmentalTelemetry", on_delete=models.RESTRICT, related_name="batch")
    crop_type = models.CharField(max_length=100)
    weight_kg = models.DecimalField(max_digits=10, decimal_places=2)
    current_custodian = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.RESTRICT, related_name="custodial_batches")
    
    # Blockchain fields
    sui_object_id = models.CharField(max_length=66, blank=True, null=True, unique=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Batch {self.id} ({self.status})"
